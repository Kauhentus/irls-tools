import {LitElement, PropertyValueMap, TemplateResult, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import { TextSnippets } from '../assets/text_snippets';

import winkNLP, { ItsFunction } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { clamp, cosine_similarity, normalize } from '../util/math';
import * as d3 from 'd3';
import { IRLSOptimizer, IRLSOptimizerParams, Vector } from '../util/IRLS_optimizer';
import * as tad from 'tadiff';

const MersenneTwister = require('mersenne-twister');
const generator = new MersenneTwister(42);

const total_element_size = 3000; // px

@customElement('irls-text-autodiff-element-v2')
export class IRLSTextAutodiffElementV2 extends LitElement {
    static styles = css`
        #container {
            display: flex;
            flex-direction: column;
        }

        .timeline-words {
            padding: 2rem;
            margin: 1rem;
            width: 3000px;
            height: 200px;

            border: 1px solid black;
            border-radius: 4px;

            font-size: 12pt;

            display: flex;
            flex-direction: row;
            position: relative;
        }

        .word-entry {
            line-height: 1;
            text-wrap: nowrap;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            position: absolute;

            padding-bottom: 8px;
            border-right: 1px solid blue;
        }

        .time-entry {
            line-height: 1;
            text-wrap: nowrap;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            position: absolute;
        }

        .event-marker {
            line-height: 1;
            text-wrap: nowrap;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            position: absolute;

            border-right: 2px solid red;
            width: 1px;
            height: 128px;
            top: 100px;
        }

        .grad-container {
            position: absolute;
            top: 0px;
            left: 0px;
        }

        .grad-dot {
            width: 2px;
            height: 2px;
            position: absolute;
            background-color: rgb(0, 200, 0);
        }

        .weight-dot {
            width: 10px;
            height: 10px;
            position: absolute;
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
    text_new = TextSnippets.apple.text_variation_3;
    // text_new = TextSnippets.apple.text_variation_3;
    // text_new = TextSnippets.apple.text_original;
    nlp = winkNLP(model);

    render(){
        return html`
            <div id='container'>
                <div class='timeline-words'>
                    ${this.text_original_elems}
                    ${this.og_timeline_markers}
                    ${this.og_event_markers}
                </div>
                <div class='timeline-words'>
                    ${this.text_new_elems}
                    ${this.new_timeline_markers}
                    ${this.new_event_markers}
                    ${this.grad_descent_vis}
                    ${this.weights_vis}
                </div>
            </div>
        `;
    }

    @state()
    text_original_elems!: TemplateResult<1>[];
    @state()
    text_new_elems!: TemplateResult<1>[];

    @state()
    og_timeline_markers!: TemplateResult<1>[];
    @state()
    new_timeline_markers!: TemplateResult<1>[];

    @state()
    og_event_markers!: TemplateResult<1>[];
    @state()
    new_event_markers!: TemplateResult<1>[];
    @state()
    grad_descent_vis!: TemplateResult<1>[];
    @state()
    weights_vis!: TemplateResult<1>[];

    socket = new WebSocket("ws://127.0.0.1:8070/");
    payloads: string[] = [];
    async firstUpdated(){
        const time_stamps = this.generate_synthetic_timestamps();
        this.generate_IRLS_mapping(time_stamps);
        this.generate_timestamp_vis(time_stamps);
    }

    generate_IRLS_mapping(time_stamps: {
        og_timestamps: [number, string][];
        new_timestamps: [number, string][];
    }){
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');
        const start_time = 0, end_time = Math.max(
            time_stamps.og_timestamps.at(-1)![0], 
            time_stamps.new_timestamps.at(-1)![0]
        );

        // set up synthetic original transcript 
        // and choose timestamps for assets to appear for now
        const valid_keyword = og_words.map((word, i) => {
            const pos_flags = this.nlp.readDoc(word).tokens().out(this.nlp.its.pos);
            const contains_noun_or_verb = pos_flags.includes('NOUN') || pos_flags.includes('VERB') || pos_flags.includes('ADJ');
            return [i, contains_noun_or_verb] as [number, boolean];
        }).filter(item => item[1]);

        let selected_words: number[] = [];
        while(selected_words.length < 3){
            const index = generator.random() * valid_keyword.length | 0;
            if(selected_words.includes(index)) continue;
            else selected_words.push(index);
        }
        selected_words = [8, 22, 29]; // TEMP
        // selected_words = [29]; // TEMP
        const selected_words_og_indices = selected_words.map(index => valid_keyword[index][0]);
        const selected_words_timestamps = selected_words_og_indices.map(i => {
            const pair = time_stamps.og_timestamps[i];
            return pair[0] - generator.random() * 100 - 200; // graphic should appear about 1/4 second before word!
        });
        this.og_event_markers = selected_words_timestamps.map(t => {;
            const time_stamp = t;
            const left_position = time_stamp / end_time * total_element_size;

            return html`<div 
                class=${'event-marker'}
                style=${`left: ${left_position}px;`}>
            </div>`;
        });

        this.text_original_elems = og_words.map((word, i) => {
            const chosen_word = selected_words_og_indices.includes(i);
            const time_stamp = time_stamps.og_timestamps[i][0];
            const left_position = time_stamp / end_time * total_element_size;

            return html`<div 
                class=${(chosen_word ? 'chosen' : 'not-chosen') + ' word-entry'}
                style=${`left: ${left_position}px; top: 100px`}>
                ${word} 
            </div>`;
        });

        // new words finding?
        type MemoAutodiff = {
            constraint: tad.Expression;
            constraint_derivatives: tad.Expression[];
        }
        let optimizers: IRLSOptimizer<MemoAutodiff>[] = [];
        let found_word_indices: number[] = [];
        let found_word_history: number[][] = [];
        let found_word_weights_history: number[][][] = [];
        let found_words_timestamps = selected_words_timestamps.map((time, i) => {
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
                    const start_step = 1000;
                    const end_step = 10;
                    const t = cur_iter / (total_iter - 1);
                    return (1 - t) * start_step + t * end_step;
                }
            };
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
                            return original_cost;
                        }, 
                        gradient: (state: Vector, memo: MemoAutodiff) => {
                            const eval_context = {variableValues: {"t": state[0]}};
                            return memo.constraint_derivatives.map(d => d.evaluate(eval_context));
                        },
                        label: `ngram_word: ${nprev_data[1]}, word: ${word} @ ${i}`
                    }, {
                        word: word,
                        word_timestamp: new_word_timestamp[0]
                    });
                });
            });

            let result = optimizer.optimize();
            found_word_history.push(optimizer.history_state.map(v => v[0]));
            found_word_weights_history.push(optimizer.history_weights);
            optimizers.push(optimizer);
            console.log('final result:', result);
            console.log('')

            let result_closest_word = time_stamps.new_timestamps
                .map((pair, i) => ({word: pair[1], dist: Math.abs(pair[0] - result[0]), i: i}))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 3);
            found_word_indices.push(result_closest_word[0].i);

            return result[0];
        });
        this.new_event_markers = found_words_timestamps.map(t => {;
            const time_stamp = t;
            const left_position = time_stamp / end_time * total_element_size;
            console.log("NEW MARKER", left_position)
            return html`<div 
                class=${'event-marker'}
                style=${`left: ${left_position}px;`}>
            </div>`;
        });
        this.grad_descent_vis = found_word_history.map(history => {
            const points = history.map((t, i) => {
                const time_stamp = t;
                const left_position = time_stamp / end_time * total_element_size;
                const top_position = i * 4;
                return `${left_position},${top_position}`;
            }).join(' ');
            console.log(points)

            return html`<svg 
                class='grad-container' 
                width=${total_element_size} height=${300}
                viewBox=${`0 0 ${total_element_size} ${300}`}>
                <polyline fill="none" stroke="green" points=${points}/>
            </svg>`;
        });
        this.weights_vis = found_word_weights_history.map((history, i) => {
            const optimizer = optimizers[i];
            const points = history.map((row, iy) => {
                const top_position = iy * 2;
                const normalized_weights = normalize(row.filter(w => w !== 1));
                let counter = 0;

                return row.map((w, ix) => {
                    const metadata = optimizer.constraint_metadata[ix];
                    const time_stamp = metadata.word_timestamp;
                    const left_position = time_stamp / end_time * total_element_size;

                    if(w == 1) return null;

                    const nw = normalized_weights[counter];
                    counter += 1;
                    const color = nw * 255 | 0;
                    console.log(normalized_weights, nw, color)
                    
                    return html`<div
                        class="weight-dot"
                        style="left: ${left_position}px; top: ${top_position}px; background-color: rgb(${color}, 125, 125)">
                    </div>`;
                });
            }).flat().filter(n => n !== null) as TemplateResult<1>[];

            return points;
        }).flat();

        this.text_new_elems = new_words.map((word, i) => {
            let found_word = found_word_indices.includes(i);
            const time_stamp = time_stamps.new_timestamps[i][0];
            const left_position = time_stamp / end_time * total_element_size;

            return html`<div 
                class=${(found_word ? 'found' : 'not-found') + ' word-entry'}
                style=${`left: ${left_position}px; top: 100px`}>
                ${word} 
            </div>`;
        });
    }  

    generate_timestamp_vis(time_stamps: {
        og_timestamps: [number, string][];
        new_timestamps: [number, string][];
    }){
        const start_time = 0, end_time = Math.max(
            time_stamps.og_timestamps.at(-1)![0], 
            time_stamps.new_timestamps.at(-1)![0]
        );

        let times = [];
        for(let i = 0; i <= end_time; i += 2000) times.push(i);


        const markers = times.map((t, i) => {
            const time_stamp = t;
            const left_position = time_stamp / end_time * total_element_size;

            return html`<div 
                class=${'time-entry'}
                style=${`left: ${left_position}px; top: 50px`}>
                ${t} 
            </div>`;
        });
        this.og_timeline_markers = markers;
        this.new_timeline_markers = markers;
    }

    generate_synthetic_timestamps(){
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');

        const get_times = (words: string[]) => {
            const times = [];
            let running_time = 0;

            for(let i = 0; i < words.length; i++){
                times.push(running_time);

                let rand1: number = generator.random();
                let rand2: number = generator.random();
                let rand3: number = generator.random();
                let rand4: number = generator.random();
                let rand5: number = generator.random();

                const current_word = words[i];
                const vowels = current_word.split('').filter(c => ['a', 'e', 'i', 'o', 'u'].includes(c));
                running_time += rand1 * 50;                             // pause at beginning
                running_time += vowels.length * (200 + rand2 * 100);    // rough world length estimate
                running_time += rand3 * 100 + 100;                      // pause between words

                if(current_word.includes(".")) running_time += 500 + rand4 * 100;
                if(current_word.includes(",")) running_time += 300 + rand5 * 100;
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

