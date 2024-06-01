import {LitElement, PropertyValueMap, TemplateResult, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import { TextSnippets } from '../assets/text_snippets';

import winkNLP, { ItsFunction } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { clamp, cosine_similarity } from '../util/math';
import * as d3 from 'd3';

@customElement('irls-text-element')
export class IRLSTextElement extends LitElement {
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
    // text_new = TextSnippets.apple.text_variation_3;
    text_new = TextSnippets.apple.text_original;
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
        // this.generate_naive_mapping();
        
        const time_stamps = this.generate_synthetic_timestamps();
        this.generate_IRLS_mapping(time_stamps);

        // let ping_time = 0;
        // this.socket.addEventListener("open", async () => {
        //     ping_time = new Date().getTime();

        //     this.generate_embedding_mapping();
        // });

        // let pong_time = 0;
        // this.socket.addEventListener("message", (event) => {
        //     pong_time = new Date().getTime();
        //     this.payloads.push(event.data);
        //     console.log(`Server responded in ${pong_time - ping_time} ms`)
        // });
    }

    async get_embeddings(words: string[]){
        return new Promise<number[][]>((res) => {
            const payload_id = this.payloads.length;
            this.socket.send(JSON.stringify(words));
    
            const wait_loop = setInterval(() => {
                if(this.payloads.length - 1 < payload_id) return;
    
                clearInterval(wait_loop);
                const data = this.payloads[payload_id];
                res(JSON.parse(data).map((vector: any) => {
                    if(!vector) return vector;
                    else return vector.slice(0, 100);
                }));
            }, 10);
        });
    }

    generate_naive_mapping() {
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');

        const valid_keyword = og_words.map((word, i) => {
            const doc = this.nlp.readDoc(word);
            const pos_flags = doc.tokens().out(this.nlp.its.pos);
            const contains_noun_or_verb = pos_flags.includes('NOUN') 
                || pos_flags.includes('VERB')
                || pos_flags.includes('ADJ');
            return [i, contains_noun_or_verb] as [number, boolean];
        }).filter(item => item[1]);

        let selected_words: number[] = [];
        const num_selected = 3;
        while(selected_words.length < num_selected){
            const index = Math.random() * valid_keyword.length | 0;
            if(selected_words.includes(index)) continue;
            else {
                selected_words.push(index);
            }
        }
        selected_words = [8, 22, 29]; // TEMP
        const selected_words_og_indices = selected_words.map(index => valid_keyword[index][0]);

        this.text_original_elems = og_words.map((word, i) => {
            const chosen_word = selected_words_og_indices.includes(i);
            return html`<span class=${chosen_word ? 'chosen' : 'not-chosen'}>${word}</span> <span> </span>`;
        });

        const keyword_context_size = 4;
        const selected_words_metadata = selected_words_og_indices.map(word_index => {
            let start = clamp(word_index - keyword_context_size, 0, og_words.length);
            let end = clamp(word_index + keyword_context_size, 0, og_words.length);
            const context_words = og_words.slice(start, end);
            const context = context_words;

            return {
                word: og_words[word_index],
                index: word_index,
                context: context,
                context_start: start,
                context_end: end
            }
        }); 

        const found_words_indices: number[] = [];
        selected_words_metadata.forEach(metadata => {
            let max_shared = 0;
            let max_shared_word = '';
            let max_shared_index = 0;
            for(let i = 0; i < og_words.length; i++){
                let start = clamp(i - keyword_context_size, 0, new_words.length);
                let end = clamp(i + keyword_context_size, 0, new_words.length);
                const current_context_words = new_words.slice(start, end);

                const searching_context_words = metadata.context;
                const shared = searching_context_words.filter(word => current_context_words.includes(word));
                if(shared.length > max_shared){
                    max_shared = shared.length;
                    max_shared_word = new_words[i];
                    max_shared_index = i;
                }
            }
            found_words_indices.push(max_shared_index)
        });

        this.text_new_elems = new_words.map((word, i) => {
            const found_word = found_words_indices.includes(i);
            return html`<span class=${found_word ? 'found' : 'not-found'}>${word}</span> <span> </span>`;
        });
    }

    async generate_embedding_mapping() {
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');

        const og_words_processed = og_words.map(word => word
            .replace(/[^a-zA-Z]/g, '')
            .toLowerCase()
            .trim())
            .map(w => {
                if(w === 'a') return 'an';
                else return w;
            });
        const new_words_processed = new_words.map(word => word
            .replace(/[^a-zA-Z]/g, '')
            .toLowerCase()
            .trim())
            .map(w => {
                if(w === 'a') return 'an';
                else return w;
            });

        const og_embeddings = await this.get_embeddings(og_words_processed);
        const new_embeddings = await this.get_embeddings(new_words_processed);
        // console.log(og_words_processed.map((w, i) => [w, og_embeddings[i]]));
        // console.log(new_words_processed.map((w, i) => [w, new_embeddings[i]]));

        // set up synthetic original transcript 
        const valid_keyword = og_words.map((word, i) => {
            const doc = this.nlp.readDoc(word);
            const pos_flags = doc.tokens().out(this.nlp.its.pos);
            const contains_noun_or_verb = pos_flags.includes('NOUN') 
                || pos_flags.includes('VERB')
                || pos_flags.includes('ADJ');
            return [i, contains_noun_or_verb] as [number, boolean];
        }).filter(item => item[1]);

        let selected_words: number[] = [];
        const num_selected = 3;
        while(selected_words.length < num_selected){
            const index = Math.random() * valid_keyword.length | 0;
            if(selected_words.includes(index)) continue;
            else {
                selected_words.push(index);
            }
        }
        // selected_words = [8, 22, 29]; // TEMP
        const selected_words_og_indices = selected_words.map(index => valid_keyword[index][0]);
        this.text_original_elems = og_words.map((word, i) => {
            const chosen_word = selected_words_og_indices.includes(i);
            return html`<span class=${chosen_word ? 'chosen' : 'not-chosen'}>${word}</span> <span> </span>`;
        });

        // try matching now! 
        const keyword_context_size = 4;
        const selected_words_metadata = selected_words_og_indices.map(word_index => {
            let start = clamp(word_index - keyword_context_size, 0, og_words.length);
            let end = clamp(word_index + keyword_context_size, 0, og_words.length);
            const context_words = og_embeddings.slice(start, end);
            const context = context_words;

            return {
                word: og_words[word_index],
                index: word_index,
                context: context,
                context_start: start,
                context_end: end
            }
        }); 

        const found_words_indices: number[] = [];
        selected_words_metadata.forEach(metadata => {
            let max_similarity = 0;
            let max_similarity_word = '';
            let max_similarity_index = 0;
            for(let i = 0; i < og_words.length; i++){
                let start = clamp(i - keyword_context_size, 0, new_words.length);
                let end = clamp(i + keyword_context_size, 0, new_words.length);

                const current_context_embeddings = new_embeddings.slice(start, end);
                const searching_context_embeddings = metadata.context;
                let similarity = 0;
                current_context_embeddings.forEach((e1, i) => {
                    // const similarities = searching_context_embeddings.map(e2 => {
                    //     if(!e1) e1 = new Array(100).fill(0);
                    //     if(!e2) e2 = new Array(100).fill(0);
                    //     return cosine_similarity(e1, e2);
                    // });
                    // const max_similarity = Math.max(...similarities);
                    // similarity += max_similarity;

                    let e2 = searching_context_embeddings[i];
                    if(!e1) e1 = new Array(100).fill(0);
                    if(!e2) e2 = new Array(100).fill(0);
                    similarity += cosine_similarity(e1, e2);
                });

                if(similarity > max_similarity){
                    max_similarity = similarity;
                    max_similarity_word = new_words[i];
                    max_similarity_index = i;
                }
            }

            console.log(metadata.word, max_similarity_word, max_similarity)
            found_words_indices.push(max_similarity_index)
        });

        this.text_new_elems = new_words.map((word, i) => {
            const found_word = found_words_indices.includes(i);
            return html`<span class=${found_word ? 'found-embedding' : 'not-found'}>${word}</span> <span> </span>`;
        });
    }

    generate_IRLS_mapping(time_stamps: {
        og_timestamps: [number, string][];
        new_timestamps: [number, string][];
    }) {
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');

        // set up synthetic original transcript 
        // and choose timestamps for assets to appear for now
        const valid_keyword = og_words.map((word, i) => {
            const doc = this.nlp.readDoc(word);
            const pos_flags = doc.tokens().out(this.nlp.its.pos);
            const contains_noun_or_verb = pos_flags.includes('NOUN') 
                || pos_flags.includes('VERB')
                || pos_flags.includes('ADJ');
            return [i, contains_noun_or_verb] as [number, boolean];
        }).filter(item => item[1]);

        let selected_words: number[] = [];
        const num_selected = 3;
        while(selected_words.length < num_selected){
            const index = Math.random() * valid_keyword.length | 0;
            if(selected_words.includes(index)) continue;
            else {
                selected_words.push(index);
            }
        }
        selected_words = [8, 22, 29]; // TEMP
        const selected_words_og_indices = selected_words.map(index => valid_keyword[index][0]);
        const selected_words_timestamps = selected_words_og_indices.map(i => {
            const pair = time_stamps.og_timestamps[i];
            return pair[0] - Math.random() * 100 - 200; // graphic should appear about 1/4 second before word!
        });

        this.text_original_elems = og_words.map((word, i) => {
            const chosen_word = selected_words_og_indices.includes(i);
            return html`<span class=${chosen_word ? 'chosen' : 'not-chosen'}>${word}</span> <span> </span>`;
        });

        // use both timestep data and word data to make prediction in new transcript
        // TODO: incorporate body position data as well!
        // potential problem with IRLS ... cost function is definitely non-convex...
        // so gradient descent/hill climbing is not likely to find optimal (true) solution. yikes

        // anyhow let's try IRLS with simulated annealing!

        const keyword_context_size = 4;
        const selected_words_new_take_likelihood_distribution = selected_words_og_indices.map(index => {
            let word = og_words[index];

            let og_start = clamp(index - keyword_context_size, 0, og_words.length);
            let og_end = clamp(index + keyword_context_size, 0, og_words.length) + 1;
            let og_context: string[] = og_words.slice(og_start, og_end);

            let new_likelihood_distribution: [number, number][] = [];
            for(let i = 0; i < new_words.length; i++){
                let new_start = clamp(i - keyword_context_size, 0, new_words.length);
                let new_end = clamp(i + keyword_context_size, 0, new_words.length) + 1;
                let new_context = new_words.slice(new_start, new_end);

                const shared = og_context.filter(word => new_context.includes(word));
                const data_point = [shared.length, time_stamps.new_timestamps[i][0]] as [number, number];
                new_likelihood_distribution.push(data_point);
            }

            let rescaled_distribution: [number, number][] = [];
            let convolved_distribution: [number, number][] = rescaled_distribution;
            let time_step = 200;
            for(let t = 0; t <= time_stamps.new_timestamps.at(-1)![0] + time_step; t += time_step){
                const get_nearest = (t: number) => {
                    if(t < new_likelihood_distribution[0][1]) return new_likelihood_distribution[0];
                    else if(t > new_likelihood_distribution.at(-1)![1]) return new_likelihood_distribution.at(-1) as [number, number];
    
                    for(let i = 1; i < new_likelihood_distribution.length; i++){
                        let low = new_likelihood_distribution[i - 1];
                        let high = new_likelihood_distribution[i];
                        if(low[1] <= t && t <= high[1]){
                            return t - low[1] < high[1] - t ? low : high;
                        }
                    }

                    throw Error("did not find bounding time frame");
                }
                const nearest = get_nearest(t);
                rescaled_distribution.push([nearest[0], t]);
            }
            for(let iter = 0; iter < 10; iter++){
                let new_convolved_distribution: [number, number][] = [];
                for(let i = 0; i < convolved_distribution.length; i++){
                    let gaussian_kernel = [0.0889118392639189,0.2238287484743217,0.3745188245235189,0.2238287484743217,0.0889118392639189];
                    let sum = 0;
                    for(let j = 0; j < 5; j++){
                        let offset = j - 2;
                        let index = clamp(i + offset, 0, convolved_distribution.length - 1);
                        sum += convolved_distribution[index][0] * gaussian_kernel[j];
                    }
                    new_convolved_distribution.push([sum, convolved_distribution[i][1]]);
                }
                convolved_distribution = new_convolved_distribution;
            }

            new_likelihood_distribution = convolved_distribution;

            const margin = { top: 20, right: 30, bottom: 40, left: 50 };
            const width = 600 - margin.left - margin.right;
            const height = 200 - margin.top - margin.bottom;
            const dataPoints = new_likelihood_distribution.map(([x, y]) => ([y, x / 10] as [number, number]));

            const xScale = d3.scaleLinear()
                .domain([0, Math.max(...dataPoints.map(dp => dp[0]))]) // Adjust domain based on your data
                .range([0, width]); // Adjust range based on your SVG dimensions

            const yScale = d3.scaleLinear()
                .domain([0, Math.max(...dataPoints.map(dp => dp[1]))]) // Adjust domain based on your data
                .range([height, 0]); // Reverse range for y-axis

            const svg = d3.select("body")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);
                
            svg.append("path")
                .datum(dataPoints)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(d => xScale(d[0]))
                    .y(d => yScale(d[1])))
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);
            
            svg.append("g")
                .attr("transform", `translate(${margin.left},${height + margin.top})`)
                .call(xAxis);
            svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`)
                .call(yAxis);
            svg.attr("style", "margin: 1rem")

            svg.append("text")
                .attr("class", "x-axis-label")
                .attr("transform", `translate(${width / 2 + margin.left}, ${height + margin.bottom + 20})`)
                .style("text-anchor", "middle")
                .style("font-size", "10pt")
                .text("time (ms)");

            svg.append("text")
                .attr("class", "y-axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", 5)
                .attr("x", -(height / 2) - margin.top)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "10pt")
                .text(`likelihood of "${word}"`);
                    
            document.body.appendChild(svg.node() as SVGSVGElement);

            return new_likelihood_distribution;
        });

        const new_words_timestamps = selected_words_timestamps.map((old_t, i) => {
            let ratio = old_t / time_stamps.og_timestamps.slice(-1)[0][0];
            let synthetic_offset = 1.1;
            let new_t_guess = ratio * synthetic_offset * time_stamps.new_timestamps.slice(-1)[0][0];
            let new_t = new_t_guess;

            let iterations = 50;
            let start_step = 5000;
            let end_step = 100;

            const current_distribution = selected_words_new_take_likelihood_distribution[i];
            const get_gradient = (t: number) => {
                if(t < current_distribution[0][1]) return 1;
                else if(t > current_distribution.at(-1)![1]) return -1;
                for(let i = 1; i < current_distribution.length; i++){
                    let low = current_distribution[i - 1];
                    let high = current_distribution[i];
                    if(low[1] <= t && t <= high[1]) return high[0] - low[0];
                }
                throw Error("did not find bounding time frame");
            }

            let max_gradient = 0;
            for(let i = 0; i < iterations; i++){
                let lerp = i / (iterations - 1);
                let step = (1 - lerp) * start_step + lerp * end_step;
                let gradient = get_gradient(new_t);

                if(gradient > max_gradient) max_gradient = gradient;
                let temperature = clamp(Math.abs(Math.log(max_gradient - gradient)), 0, 5);
                if(max_gradient - gradient <= 0) temperature = 5;
                let noise = temperature * (Math.random() - 0.5) * step;
                
                new_t += step * gradient + noise * 0.2;                
            }

            console.log('predicted', new_t);
            return new_t;
        });

        this.text_new_elems = new_words.map((word, i) => {
            const prev_t = i == 0 ? 0 : time_stamps.new_timestamps[i - 1][0];
            const curr_t = time_stamps.new_timestamps[i][0];

            // console.log(word, prev_t, curr_t, new_words_timestamps)
            // console.log(...new_words_timestamps.map(t => prev_t <= t && t <= curr_t))

            let found_word = false;
            if(new_words_timestamps.some(t => prev_t <= t && t <= curr_t)) found_word = true;

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

