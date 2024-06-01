"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRLSTextElement = void 0;
const lit_1 = require("lit");
const decorators_js_1 = require("lit/decorators.js");
const text_snippets_1 = require("../assets/text_snippets");
const wink_nlp_1 = __importDefault(require("wink-nlp"));
const wink_eng_lite_web_model_1 = __importDefault(require("wink-eng-lite-web-model"));
const math_1 = require("../util/math");
let IRLSTextElement = class IRLSTextElement extends lit_1.LitElement {
    constructor() {
        super(...arguments);
        this.text_original = text_snippets_1.TextSnippets.apple.text_original;
        this.text_new = text_snippets_1.TextSnippets.apple.text_variation_3;
        this.nlp = (0, wink_nlp_1.default)(wink_eng_lite_web_model_1.default);
    }
    static { this.styles = (0, lit_1.css) `
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
    `; }
    render() {
        return (0, lit_1.html) `
            <div id='container'>
                <p>${this.text_original_elems}</p>
                <p>${this.text_new_elems}</p>
            </div>
        `;
    }
    async firstUpdated() {
        // const time_stamps = this.generate_synthetic_timestamps();
        // console.log(time_stamps);
        // this.generate_naive_mapping();
        // this.generate_IRLS_mapping(time_stamps);
        // console.log(vectors.vectors['king'])
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
            return [i, contains_noun_or_verb];
        }).filter(item => item[1]);
        let selected_words = [];
        const num_selected = 3;
        while (selected_words.length < num_selected) {
            const index = Math.random() * valid_keyword.length | 0;
            if (selected_words.includes(index))
                continue;
            else {
                selected_words.push(index);
            }
        }
        selected_words = [8, 22, 29]; // TEMP
        const selected_words_og_indices = selected_words.map(index => valid_keyword[index][0]);
        this.text_original_elems = og_words.map((word, i) => {
            const chosen_word = selected_words_og_indices.includes(i);
            return (0, lit_1.html) `<span class=${chosen_word ? 'chosen' : 'not-chosen'}>${word}</span> <span> </span>`;
        });
        const keyword_context_size = 4;
        const selected_words_metadata = selected_words_og_indices.map(word_index => {
            let start = (0, math_1.clamp)(word_index - keyword_context_size, 0, og_words.length);
            let end = (0, math_1.clamp)(word_index + keyword_context_size, 0, og_words.length);
            const context_words = og_words.slice(start, end);
            const context = context_words;
            return {
                word: og_words[word_index],
                index: word_index,
                context: context,
                context_start: start,
                context_end: end
            };
        });
        const found_words_indices = [];
        selected_words_metadata.forEach(metadata => {
            let max_shared = 0;
            let max_shared_word = '';
            let max_shared_index = 0;
            for (let i = 0; i < og_words.length; i++) {
                let start = (0, math_1.clamp)(i - keyword_context_size, 0, new_words.length);
                let end = (0, math_1.clamp)(i + keyword_context_size, 0, new_words.length);
                const current_context_words = new_words.slice(start, end);
                const searching_context_words = metadata.context;
                const shared = searching_context_words.filter(word => current_context_words.includes(word));
                if (shared.length > max_shared) {
                    max_shared = shared.length;
                    max_shared_word = new_words[i];
                    max_shared_index = i;
                }
            }
            found_words_indices.push(max_shared_index);
        });
        this.text_new_elems = new_words.map((word, i) => {
            const found_word = found_words_indices.includes(i);
            return (0, lit_1.html) `<span class=${found_word ? 'found' : 'not-found'}>${word}</span> <span> </span>`;
        });
    }
    generate_IRLS_mapping(time_stamps) {
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
            return [i, contains_noun_or_verb];
        }).filter(item => item[1]);
        let selected_words = [];
        const num_selected = 3;
        while (selected_words.length < num_selected) {
            const index = Math.random() * valid_keyword.length | 0;
            if (selected_words.includes(index))
                continue;
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
            return (0, lit_1.html) `<span class=${chosen_word ? 'chosen' : 'not-chosen'}>${word}</span> <span> </span>`;
        });
        // use both timestep data and word data to make prediction in new transcript
        // TODO: incorporate body position data as well!
        // potential problem with IRLS ... cost function is definitely non-convex...
        // so gradient descent/hill climbing is not likely to find optimal (true) solution. yikes
        // anyhow let's try IRLS with simulated annealing!
        const new_words_timestamps = selected_words_timestamps.map(old_t => {
            let ratio = old_t / time_stamps.og_timestamps.slice(-1)[0][0];
            // let new_t_guess = ratio * time_stamps.new_timestamps.slice(-1)[0][0]; // guess is too good for synthetic data
            let new_t_guess = ratio * 0.5 * time_stamps.new_timestamps.slice(-1)[0][0];
            let iterations = 100;
            let start_step = 1000;
            let end_step = 100;
            for (let i = 0; i < iterations; i++) {
                let lerp = i / (iterations - 1);
                let step = (1 - lerp) * start_step + lerp * end_step;
                // hmmm this is kind of yucky...
            }
            return new_t_guess;
        });
        this.text_new_elems = new_words.map((word, i) => {
            // const found_word = found_words_indices.includes(i);
            const prev_t = i == 0 ? 0 : time_stamps.new_timestamps[i - 1][0];
            const curr_t = time_stamps.new_timestamps[i][0];
            console.log(word, prev_t, curr_t, new_words_timestamps);
            console.log(...new_words_timestamps.map(t => prev_t <= t && t <= curr_t));
            let found_word = false;
            if (new_words_timestamps.some(t => prev_t <= t && t <= curr_t))
                found_word = true;
            return (0, lit_1.html) `<span class=${found_word ? 'found' : 'not-found'}>${word}</span> <span> </span>`;
        });
    }
    generate_synthetic_timestamps() {
        const og_words = this.text_original.split(' ');
        const new_words = this.text_new.split(' ');
        const get_times = (words) => {
            const times = [];
            let running_time = 0;
            for (let i = 0; i < words.length; i++) {
                times.push(running_time);
                const current_word = words[i];
                const vowels = current_word.split('').filter(c => ['a', 'e', 'i', 'o', 'u'].includes(c));
                running_time += Math.random() * 50; // pause at beginning
                running_time += vowels.length * (200 + Math.random() * 100); // rough world length estimate
                running_time += Math.random() * 100 + 100; // pause between words
                if (current_word.includes("."))
                    running_time += 500 + Math.random() * 100;
                if (current_word.includes(","))
                    running_time += 300 + Math.random() * 100;
            }
            return times;
        };
        const og_timestamps = get_times(og_words);
        const new_timestamps = get_times(new_words); //.map(t => t * 1.2); // speak slower in new time stamps
        return {
            og_timestamps: og_timestamps.map((t, i) => [t, og_words[i]]),
            new_timestamps: new_timestamps.map((t, i) => [t, new_words[i]])
        };
    }
};
exports.IRLSTextElement = IRLSTextElement;
__decorate([
    (0, decorators_js_1.state)()
], IRLSTextElement.prototype, "text_original_elems", void 0);
__decorate([
    (0, decorators_js_1.state)()
], IRLSTextElement.prototype, "text_new_elems", void 0);
exports.IRLSTextElement = IRLSTextElement = __decorate([
    (0, decorators_js_1.customElement)('irls-text-element')
], IRLSTextElement);
