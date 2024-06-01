
import {LitElement, PropertyValueMap, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import * as tad from 'tadiff';
import { IRLSOptimizer, IRLSOptimizerParams, Vector } from '../util/IRLS_optimizer';

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

    overlap_area_autodiff(box: Box){
        if(!this.overlaps(box)) return '0.0';

        let overlap_left = this.x > box.x ? `x` : `${box.x}`;
        let overlap_right = this.x + this.w < box.x + box.w ? `x + ${this.w}` : `${box.x + box.w}`;
        let overlap_top = this.y > box.y ? `y` : `${box.y}`;
        let overlap_bottom = this.y + this.h < box.y + box.h ? `y + ${this.h}` : `${box.y + box.h}`;

        let str = `(${overlap_right} - ${overlap_left}) * (${overlap_bottom} - ${overlap_top})`;
        return str;
    }

    overlap_xarea_autodiff(box: Box){
        if(!this.overlaps(box)) return '0.0';
        let overlap_left = this.x > box.x ? `x` : `${box.x}`;
        let overlap_right = this.x + this.w < box.x + box.w ? `x + ${this.w}` : `${box.x + box.w}`;
        let str = `(${overlap_right} - ${overlap_left})`;
        return str;
    }

    overlap_yarea_autodiff(box: Box){
        if(!this.overlaps(box)) return '0.0';
        let overlap_top = this.y > box.y ? `y` : `${box.y}`;
        let overlap_bottom = this.y + this.h < box.y + box.h ? `y + ${this.h}` : `${box.y + box.h}`;
        let str = `(${overlap_bottom} - ${overlap_top})`;
        return str;
    }

    alignment_x_t(box: Box, t: number){
        const this_centered_x = this.x + this.w * t;
        const box_centered_x = box.x + box.w * t;
        return Math.abs(this_centered_x - box_centered_x);
    }
    alignment_x_left = (box: Box) => this.alignment_x_t(box, 0.0);
    alignment_x_center = (box: Box) => this.alignment_x_t(box, 0.5);
    alignment_x_right = (box: Box) => this.alignment_x_t(box, 1.0);

    alignment_x_t_autodiff(box: Box, t: number){
        const this_centered_x = `x + ${this.w * t}`;
        const box_centered_x = `${box.x + box.w * t}`;
        return `abs(${this_centered_x} - ${box_centered_x})`
    }
    alignment_x_left_autodiff = (box: Box) => this.alignment_x_t_autodiff(box, 0.0);
    alignment_x_center_autodiff = (box: Box) => this.alignment_x_t_autodiff(box, 0.5);
    alignment_x_right_autodiff = (box: Box) => this.alignment_x_t_autodiff(box, 1.0);

    alignment_y_t(box: Box, t: number){
        const this_centered_y = this.y + this.h * t;
        const box_centered_y = box.y + box.h * t;
        return Math.abs(this_centered_y - box_centered_y);
    }
    alignment_y_left = (box: Box) => this.alignment_y_t(box, 0.0);
    alignment_y_center = (box: Box) => this.alignment_y_t(box, 0.5);
    alignment_y_right = (box: Box) => this.alignment_y_t(box, 1.0);

    alignment_y_t_autodiff(box: Box, t: number){
        const this_centered_y = `y + ${this.h * t}`;
        const box_centered_y = `${box.y + box.h * t}`;
        return `abs(${this_centered_y} - ${box_centered_y})`
    }
    alignment_y_left_autodiff = (box: Box) => this.alignment_y_t_autodiff(box, 0.0);
    alignment_y_center_autodiff = (box: Box) => this.alignment_y_t_autodiff(box, 0.5);
    alignment_y_right_autodiff = (box: Box) => this.alignment_y_t_autodiff(box, 1.0);

    compute_constrained_position(other_boxes: Box[]){
        // let position = [this.x, this.y];
        const IRLS_iters = 50;
        const max_dist = 20;

        // const constraints: [number, tad.Expression[], (position: number[]) => boolean][] = [
        //     ...other_boxes.map(box => [100.0, (() => {
        //         const expr = this.alignment_x_left_autodiff(box);
        //         const constraint = tad.parseExpression(expr);
        //         const vars = tad.getAllVariables(constraint);
        //         const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         return [constraint, constraint_dx, constraint_dy];
        //     })(), (position: number[]) => {
        //         const synthetic_box = box.clone();
        //         synthetic_box.x = position[0];
        //         synthetic_box.y = position[1];
        //         return this.alignment_x_left(box) < max_dist;
        //     }] as [number, tad.Expression[], (position: number[]) => boolean]),

        //     ...other_boxes.map(box => [100.0, (() => {
        //         const expr = this.alignment_x_right_autodiff(box);
        //         const constraint = tad.parseExpression(expr);
        //         const vars = tad.getAllVariables(constraint);
        //         const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         return [constraint, constraint_dx, constraint_dy];
        //     })(), (position: number[]) => {
        //         const synthetic_box = box.clone();
        //         synthetic_box.x = position[0];
        //         synthetic_box.y = position[1];
        //         return this.alignment_x_right(box) < max_dist;
        //     }] as [number, tad.Expression[], (position: number[]) => boolean]),

        //     ...other_boxes.map(box => [100.0, (() => {
        //         const expr = this.alignment_y_left_autodiff(box);
        //         const constraint = tad.parseExpression(expr);
        //         const vars = tad.getAllVariables(constraint);
        //         const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         return [constraint, constraint_dx, constraint_dy];
        //     })(), (position: number[]) => {
        //         const synthetic_box = box.clone();
        //         synthetic_box.x = position[0];
        //         synthetic_box.y = position[1];
        //         return this.alignment_y_left(box) < max_dist;
        //     }] as [number, tad.Expression[], (position: number[]) => boolean]),

        //     ...other_boxes.map(box => [100.0, (() => {
        //         const expr = this.alignment_y_right_autodiff(box);
        //         const constraint = tad.parseExpression(expr);
        //         const vars = tad.getAllVariables(constraint);
        //         const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
        //         return [constraint, constraint_dx, constraint_dy];
        //     })(), (position: number[]) => {
        //         const synthetic_box = box.clone();
        //         synthetic_box.x = position[0];
        //         synthetic_box.y = position[1];
        //         return this.alignment_y_right(box) < max_dist;
        //     }] as [number, tad.Expression[], (position: number[]) => boolean]),
        // ];

        // const get_state_cost = (position: number[]): [number, number[]] => {
        //     let total_cost = 0;
        //     let costs: number[] = [];

        //     constraints.forEach(c_pair => {
        //         const constraint_weight = c_pair[0];
        //         const eval_context = {
        //             variableValues: {
        //                 "x": position[0],
        //                 "y": position[1]
        //             }
        //         }
        //         const current_constraint = c_pair[1][0];
        //         const constraint_cost = current_constraint.evaluate(eval_context);
        //         let cost = constraint_weight * constraint_cost;
        //         if(constraint_cost === Infinity && constraint_weight === 0) cost = Infinity;
        //         if(cost !== Infinity) total_cost += cost;
        //         costs.push(cost);
        //     });
        //     return [total_cost, costs];
        // }

        const start_step = 5;
        const end_step = 1;
        const params: IRLSOptimizerParams = {
            initial_state: [this.x, this.y],
            num_iterations: IRLS_iters,
            weight_epsilon: 1,
            dimension: 2,
            step_scheduler: (i: number, total_iters: number) => {
                const t = (i / (total_iters - 1)) ** 0.5;
                return start_step * (1 - t) + end_step * t;
            }
        };
        type MemoAutodiff = {
            constraint: tad.Expression;
            constraint_derivatives: tad.Expression[];
        }
        const optimizer = new IRLSOptimizer<MemoAutodiff>(params);

        const create_geometric_constraint = (
            box: Box,
            auto_diff_expression: (box: Box) => string,
            constraint_cost_test: (box: Box) => number
        ) => ({
            memo: (position: Vector) => {
                const constraint = tad.parseExpression(auto_diff_expression(box));
                const vars = tad.getAllVariables(constraint);
                const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                return {
                    constraint: constraint,
                    constraint_derivatives: [constraint_dx, constraint_dy]
                }
            },
            use_constraint: (position: Vector) => {
                const synthetic_box = box.clone();
                synthetic_box.x = position[0];
                synthetic_box.y = position[1];
                return constraint_cost_test(box) < max_dist;
            },
            cost: (position: Vector, memo: MemoAutodiff) => {
                const eval_context = {variableValues: {"x": position[0], "y": position[1]}}
                return memo.constraint.evaluate(eval_context);
            },
            gradient: (position: Vector, memo: MemoAutodiff) => {
                const eval_context = {variableValues: {"x": position[0], "y": position[1]}}
                return memo.constraint_derivatives.map(d => d.evaluate(eval_context));
            },
        });

        other_boxes.forEach(box => {
            optimizer.add_constraint(1.0, {
                memo: (position: Vector) => {
                    const constraint = tad.parseExpression(this.alignment_x_left_autodiff(box));
                    const vars = tad.getAllVariables(constraint);
                    const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    return {
                        constraint: constraint,
                        constraint_derivatives: [constraint_dx, constraint_dy]
                    }
                },
                use_constraint: (position: Vector) => {
                    const synthetic_box = box.clone();
                    synthetic_box.x = position[0];
                    synthetic_box.y = position[1];
                    return this.alignment_x_left(box) < max_dist;
                },
                cost: (position: Vector, memo: MemoAutodiff) => {
                    const eval_context = {variableValues: {"x": position[0], "y": position[1]}}
                    return memo.constraint.evaluate(eval_context);
                },
                gradient: (position: Vector, memo: MemoAutodiff) => {
                    const eval_context = {variableValues: {"x": position[0], "y": position[1]}}
                    return memo.constraint_derivatives.map(d => d.evaluate(eval_context));
                },
            })
        });


        let result = optimizer.optimize();
        
        // console.log('final weights:', optimizer.weights, '\n');
        // console.log('final costs:', final_final_costs, '\n')

        this.x_c = result[0];
        this.y_c = result[1];
        this.has_constrained_position = true;
    }
}

@customElement('irls-autodiff-element')
export class IRLSAutodiffElement extends LitElement {
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

            if(this._active_box !== -1){
                const box = this._boxes[this._active_box];
                if(box.has_constrained_position){
                    box.x = box.x_c;
                    box.y = box.y_c;
                }
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