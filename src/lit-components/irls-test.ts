
import {LitElement, PropertyValueMap, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';

export class Box {
    x: number;
    y: number;
    w: number;
    h: number;
    color: number;
    offset: number[];

    has_constrained_position = false;
    x_c = -1;
    y_c = -1;

    constructor(x: number, y: number, w: number, h: number){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = Math.random() * 0xffffff | 0;

        this.offset = [0, 0];
    }

    clone(){
        return new Box(this.x, this.y, this.w, this.h);
    }

    overlaps(box: Box){
        const no_x_overlap = this.x > box.x + box.w || this.x + this.w < box.x;
        const no_y_overlap = this.y > box.y + box.h || this.y + this.h < box.y;
        return !(no_x_overlap || no_y_overlap);
    }

    overlap_area(box: Box){
        if(!this.overlaps(box)) return 0;

        let overlap_left = Math.max(this.x, box.x);
        let overlap_right = Math.min(this.x + this.w, box.x + box.w);
        let overlap_top = Math.max(this.y, box.y);
        let overlap_bottom = Math.min(this.y + this.h, box.y + box.h);

        return (overlap_right - overlap_left) * (overlap_bottom - overlap_top);
    }

    alignment_x_t(box: Box, t: number){
        const this_centered_x = this.x + this.w * t;
        const box_centered_x = box.x + box.w * t;
        return Math.abs(this_centered_x - box_centered_x);
    }
    alignment_x_left = (box: Box) => this.alignment_x_t(box, 0.0);
    alignment_x_center = (box: Box) => this.alignment_x_t(box, 0.5);
    alignment_x_right = (box: Box) => this.alignment_x_t(box, 1.0);

    alignment_y_t(box: Box, t: number){
        const this_centered_y = this.y + this.h * t;
        const box_centered_y = box.y + box.h * t;
        return Math.abs(this_centered_y - box_centered_y);
    }
    alignment_y_left = (box: Box) => this.alignment_y_t(box, 0.0);
    alignment_y_center = (box: Box) => this.alignment_y_t(box, 0.5);
    alignment_y_right = (box: Box) => this.alignment_y_t(box, 1.0);

    compute_constrained_position(other_boxes: Box[]){
        let position = [this.x, this.y];
        const IRLS_iters = 20;

        const max_dist = 20;
        const constraints: [number, (main_box: Box, other_boxes: Box[]) => number][] = [
            // x-axis alignment
            ...other_boxes.map(box => [0.5, (main_box: Box, other_boxes: Box[]) => {
                const dist_from_align = main_box.alignment_x_left(box);
                return dist_from_align > max_dist ? Infinity : dist_from_align;
            }] as [number, (main_box: Box, other_boxes: Box[]) => number]),

            ...other_boxes.map(box => [0.5, (main_box: Box, other_boxes: Box[]) => {
                const dist_from_align = main_box.alignment_x_right(box);
                return dist_from_align > max_dist ? Infinity : dist_from_align;
            }] as [number, (main_box: Box, other_boxes: Box[]) => number]),

            // y-axis alignment
            ...other_boxes.map(box => [0.5, (main_box: Box, other_boxes: Box[]) => {
                const dist_from_align = main_box.alignment_y_left(box);
                return dist_from_align > max_dist ? Infinity : dist_from_align;
            }] as [number, (main_box: Box, other_boxes: Box[]) => number]),

            ...other_boxes.map(box => [0.5, (main_box: Box, other_boxes: Box[]) => {
                const dist_from_align = main_box.alignment_y_right(box);
                return dist_from_align > max_dist ? Infinity : dist_from_align;
            }] as [number, (main_box: Box, other_boxes: Box[]) => number]),

            // difference from original box
            // [0.01, (main_box: Box, other_boxes: Box[]) => {
            //     const dist_from_og = Math.sqrt(
            //         (main_box.x - this.x) ** 2 +
            //         (main_box.y - this.y) ** 2
            //     );
            //     return dist_from_og;
            // }],

            // no overlap
            [100.0, (main_box: Box, other_boxes: Box[]) => {
                return other_boxes
                    .map(box => {
                        const cost_A = main_box.overlaps(box) ? 100 as number : 0 as number; // discrete overlaps yes or no
                        const cost_B = main_box.overlap_area(box); // how much area is overlapped (want to reduce this!)
                        return cost_B;
                    })
                    .reduce((a, b) => a + b);
            }]
        ]

        const get_state_cost = (position: number[]): [number, number[]] => {
            let total_cost = 0, costs: number[] = [];
            let synthetic_box = this.clone();
            synthetic_box.x = position[0];
            synthetic_box.y = position[1];

            constraints.forEach(c_pair => {
                const constraint_weight = c_pair[0];
                const constraint_cost = c_pair[1](synthetic_box, other_boxes);
                let cost = constraint_weight * constraint_cost;
                if(constraint_cost === Infinity && constraint_weight === 0) cost = Infinity;
                if(cost !== Infinity) total_cost += cost;
                costs.push(cost);
            });
            return [total_cost, costs];
        }

        const start_step = 1;
        const end_step = 1;
        const step_schedule = [];

        for(let i = 0; i < IRLS_iters; i++){
            const t = (i / (IRLS_iters - 1)) ** 0.5;
            const step = start_step * (1 - t) + end_step * t;
            step_schedule.push(step);
        }
        for(let i = 0; i < 20; i++){
            step_schedule.push(0.2);
        }

        let final_final_costs: number[] = [];
        for(let i = 0; i < step_schedule.length; i++){
            // ATTEMPT 1
            // generate neighbors through hill climbing :sobbing:
            const step = step_schedule[i];
            const neighbors = [
                [0, 0], [0, -step], [0, step], [-step, 0], [step, 0]
            ].map(offset => [position[0] + offset[0], position[1] + offset[1]]);
            const neighbor_costs = neighbors
                .map((n, i) => [get_state_cost(n), i] as [[number, number[]], number])
                .sort((a, b) => a[0][0] - b[0][0]);

            // look into autodiff in javascript

            const best_neighbor = neighbors[neighbor_costs[0][1]];
            position = best_neighbor;
            const final_costs = get_state_cost(best_neighbor)[1];
            final_final_costs = final_costs;
            // if(i < 5) console.log(neighbor_costs.map(n => [n[0][0], n[1]]))

            // update weights for IRLS
            constraints.map((c_pair, i) => {
                c_pair[0] = 1 / (1 + final_costs[i]);
            });
        }
        
        console.log(Math.random())
        console.log('final weights:', constraints.map(c_pair => c_pair[0]))
        console.log('final costs:', final_final_costs, '\n')

        this.x_c = position[0];
        this.y_c = position[1];
        this.has_constrained_position = true;
    }
}

@customElement('irls-element')
export class IRLSElement extends LitElement {
    static styles = css`
    canvas {
        border: 1px solid black;
    }
    `;

    @query('#base') canvas!: HTMLCanvasElement;
    canvasWidth = 800;
    canvasHeight = 600;

    render(){
        return html`
            <canvas
                id="base"
                width=${this.canvasWidth}
                height=${this.canvasHeight}
            ></canvas>
        `;
    }

    _active_box = -1;
    _boxes: Box[] = [];
    _mousedown: boolean = false;
    _ctx!: CanvasRenderingContext2D;
    async firstUpdated() {
        requestAnimationFrame((timestamp) => this._loop(timestamp));

        // initialize boxes
        const A = new Box(100, 100, 100, 100);
        const B = new Box(400, 200, 100, 100);
        const C = new Box(200, 400, 250, 100);
        this._boxes = [A, B, C];

        // initialize event listeners
        this.canvas.addEventListener('mousedown', (event) => {
            const [x, y] = [event.offsetX, event.offsetY];
            this._mousedown = true;
            this._boxes.forEach((box, i) => {
                const in_x_range = box.x <= x && x <= box.x + box.w;
                const in_y_range = box.y <= y && y <= box.y + box.h;
                if(in_x_range && in_y_range){
                    this._active_box = i;
                    box.offset = [x - box.x, y - box.y];
                }
            });
        });
        this.canvas.addEventListener('mouseup', () => {
            this._mousedown = false;

            const box = this._boxes[this._active_box];
            if(box.has_constrained_position){
                box.x = box.x_c;
                box.y = box.y_c;
            }

            this._active_box = -1;
            this._boxes.forEach(box => {
                box.offset = [0, 0];
                box.has_constrained_position = false;
                box.x_c = -1;
                box.y_c = -1; 
            });
        });
        this.canvas.addEventListener('mousemove', (event) => {
            // if(this._mousedown) console.log(event.offsetX, event.offsetY);
            if(this._active_box !== -1){
                const box = this._boxes[this._active_box];
                const [x, y] = [event.offsetX, event.offsetY];
                box.x = x - box.offset[0];
                box.y = y - box.offset[1];

                const other_boxes = this._boxes.filter(b => b != box);
                box.compute_constrained_position(other_boxes);
            }
        });
        this._ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    }

    _lastRender = 0;
    _loop(timestamp: number) {
        const progress = timestamp - this._lastRender;
        this._lastRender = timestamp;
    
        if(this._ctx){
            this._ctx.save();
            this._ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.draw(this._ctx);
            this._ctx.restore();
        }
    
        requestAnimationFrame((timestamp) => this._loop(timestamp));
    }

    draw(ctx: CanvasRenderingContext2D) {
        this._boxes.forEach((box, i) => {
            ctx.fillStyle = `#${box.color.toString(16).padStart(6, '0')}88`;
            ctx.fillRect(box.x, box.y, box.w, box.h);

            if(this._active_box === i){
                ctx.strokeStyle = '#ff000088';
                ctx.lineWidth = 2;
                ctx.strokeRect(box.x, box.y, box.w, box.h);

                if(box.has_constrained_position){
                    ctx.strokeStyle = '#0000ff88';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x_c, box.y_c, box.w, box.h);
                }
            }
        });
    }
}