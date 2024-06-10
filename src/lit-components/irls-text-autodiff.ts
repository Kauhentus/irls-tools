import {LitElement, PropertyValueMap, TemplateResult, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import { TextSnippets } from '../assets/text_snippets';

import winkNLP, { ItsFunction } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { clamp, cosine_similarity } from '../util/math';
import * as d3 from 'd3';
import { IRLSOptimizer, IRLSOptimizerParams, Vector } from '../util/IRLS_optimizer';
import * as tad from 'tadiff';

@customElement('irls-text-autodiff-element')
export class IRLSTextAutodiffElement extends LitElement {
    static styles = css`
        #container {
            display: flex;
            flex-direction: row;
        }

        p {
            padding: 2rem;
            margin: 1rem;
            width: 40vw;

            border: 1px solid black;
            border-radius: 4px;

            font-size: 14pt;
        }

        .chosen {
            background-color: rgb(255, 200, 200);
        }

        .found {
            background-color: rgb(200, 255, 200);
        }

        .found-embedding {
            background-color: rgb(200, 200, 255);
        }
    `;

    text_original = TextSnippets.apple.text_original;
    text_new = TextSnippets.apple.text_original;
    // text_new = TextSnippets.apple.text_variation_3;
    // text_new = TextSnippets.apple.text_original;
    nlp = winkNLP(model);

    render(){
        return html`
            <div id='container'>
                <p>${this.text_original_elems}</p>
                <p>${this.text_new_elems}</p>
            </div>
        `;
    }

    @state()
    text_original_elems!: TemplateResult<1>[];
    @state()
    text_new_elems!: TemplateResult<1>[];

    socket = new WebSocket("ws://127.0.0.1:8070/");
    payloads: string[] = [];
    async firstUpdated(){
        const time_stamps = this.generate_synthetic_timestamps();
        this.generate_IRLS_mapping(time_stamps);
    }

    generate_IRLS_mapping(time_stamps: {
        og_timestamps: [number, string][];
        new_timestamps: [number, string][];
    }){
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');

        // set up synthetic original transcript 
        // and choose timestamps for assets to appear for now
        const valid_keyword = og_words.map((word, i) => {
            const pos_flags = this.nlp.readDoc(word).tokens().out(this.nlp.its.pos);
            const contains_noun_or_verb = pos_flags.includes('NOUN') || pos_flags.includes('VERB') || pos_flags.includes('ADJ');
            return [i, contains_noun_or_verb] as [number, boolean];
        }).filter(item => item[1]);

        let selected_words: number[] = [];
        while(selected_words.length < 3){
            const index = Math.random() * valid_keyword.length | 0;
            if(selected_words.includes(index)) continue;
            else selected_words.push(index);
        }
        selected_words = [8, 22, 29]; // TEMP
        // selected_words = [29]; // TEMP
        const selected_words_og_indices = selected_words.map(index => valid_keyword[index][0]);
        const selected_words_timestamps = selected_words_og_indices.map(i => {
            const pair = time_stamps.og_timestamps[i];
            return pair[0] - Math.random() * 100 - 200; // graphic should appear about 1/4 second before word!
        });
        this.text_original_elems = og_words.map((word, i) => {
            const chosen_word = selected_words_og_indices.includes(i);
            return html`<span class=${chosen_word ? 'chosen' : 'not-chosen'}>${word}</span> <span> </span>`;
        });

        // new words finding?
        let found_word_indices: number[] = [];
        selected_words_timestamps.forEach((time, i) => {
            const word_index = selected_words_og_indices[i];
            const word = og_words[word_index]
            const timestamp = time;
            console.log(word, timestamp);

            const ngram_n = 3; // n-gram
            const distance_data = [];
            for(let i = 1; i < ngram_n; i++){
                const current_word_index = word_index - i;
                const current_timestamp = time_stamps.og_timestamps[current_word_index];
                distance_data.push([
                    ...current_timestamp,
                    timestamp - current_timestamp[0]
                ] as [number, string, number]);
            }

            // control where the guess starts (can be good or bad)
            let ratio = timestamp / time_stamps.og_timestamps.slice(-1)[0][0];
            let synthetic_offset = 1;
            let new_t_guess = ratio * synthetic_offset * time_stamps.new_timestamps.slice(-1)[0][0];

            const params: IRLSOptimizerParams = {
                initial_state: [new_t_guess],
                num_iterations: 30,
                weight_epsilon: 1,
                dimension: 1,
                step_scheduler: function (cur_iter: number, total_iter: number): number {
                    const start_step = 5000;
                    const end_step = 10;
                    const t = cur_iter / (total_iter - 1);
                    return (1 - t) * start_step + t * end_step;
                }
            };
            type MemoAutodiff = {
                constraint: tad.Expression;
                constraint_derivatives: tad.Expression[];
            }
            const optimizer = new IRLSOptimizer<MemoAutodiff>(params);

            distance_data.forEach(nprev_data => {
                // console.log(nprev_data)
                new_words.forEach((word, i) => {
                    const new_word_timestamp = time_stamps.new_timestamps[i];

                    optimizer.add_constraint(1.0, {
                        use_constraint: (state: Vector, memo: MemoAutodiff) => {
                            if(word !== nprev_data[1]) return false; // only match n-gram words

                            let new_word_ratio = new_word_timestamp[0] / time_stamps.new_timestamps.at(-1)![0];
                            let old_word_ratio = nprev_data[0] / time_stamps.og_timestamps.at(-1)![0];
                            if(Math.abs(new_word_ratio - old_word_ratio) > 0.1) return false; // only use n-gram words near "where it appears"

                            return true;
                        },
                        memo: (state: Vector) => {
                            // const constraint = tad.parseExpression(`((t - ${new_word_timestamp[0]}) - ${nprev_data[2]})^2`);
                            // const constraint = tad.parseExpression(`(abs(t - ${new_word_timestamp[0]}) - ${nprev_data[2]})^2`);
                            // const constraint = tad.parseExpression(`abs(abs(t - ${new_word_timestamp[0]}) - ${nprev_data[2]})`);
                            const constraint = tad.parseExpression(`abs((t - ${new_word_timestamp[0]}) - ${nprev_data[2]})`);
                            const vars = tad.getAllVariables(constraint);
                            const constraint_dt = tad.getDerivativeForExpression(vars["t"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                            return {
                                constraint: constraint,
                                constraint_derivatives: [constraint_dt]
                            }
                        },
                        cost: (state: Vector, memo: MemoAutodiff) => {
                            const eval_context = {variableValues: {"t": state[0]}};
                            const original_cost = memo.constraint.evaluate(eval_context);
                            // return Math.log(original_cost);
                            // return original_cost / 1000;
                            // return Math.sqrt(original_cost);
                            return original_cost;
                        }, 
                        gradient: (state: Vector, memo: MemoAutodiff) => {
                            const eval_context = {variableValues: {"t": state[0]}};
                            return memo.constraint_derivatives.map(d => d.evaluate(eval_context));
                        },
                        label: `ngram_word: ${nprev_data[1]}, word: ${word} @ ${i}`
                    })
                });
            });

            let result = optimizer.optimize();
            // console.log('final weights:', optimizer.weights, '\n');
            console.log('final result:', result);
            console.log('')

            let result_closest_word = time_stamps.new_timestamps
                .map((pair, i) => ({word: pair[1], dist: Math.abs(pair[0] - result[0]), i: i}))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 3);
            // console.log(result_closest_word);
            found_word_indices.push(result_closest_word[0].i);
        });

        this.text_new_elems = new_words.map((word, i) => {
            let found_word = found_word_indices.includes(i);
            return html`<span class=${found_word ? 'found' : 'not-found'}>${word}</span> <span> </span>`;
        });
    }  

    generate_synthetic_timestamps(){
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');

        const get_times = (words: string[]) => {
            const times = [];
            let running_time = 0;

            for(let i = 0; i < words.length; i++){
                times.push(running_time);

                const current_word = words[i];
                const vowels = current_word.split('').filter(c => ['a', 'e', 'i', 'o', 'u'].includes(c));
                running_time += Math.random() * 50;                             // pause at beginning
                running_time += vowels.length * (200 + Math.random() * 100);    // rough world length estimate
                running_time += Math.random() * 100 + 100;                      // pause between words

                if(current_word.includes(".")) running_time += 500 + Math.random() * 100;
                if(current_word.includes(",")) running_time += 300 + Math.random() * 100;
            }

            return times;
        }

        const og_timestamps = get_times(og_words);
        const new_timestamps = get_times(new_words); //.map(t => t * 1.2); // speak slower in new time stamps

        return {
            og_timestamps: og_timestamps.map((t, i) => [t, og_words[i]] as [number, string]),
            new_timestamps: new_timestamps.map((t, i) => [t, new_words[i]] as [number, string])
        }
    }
}

