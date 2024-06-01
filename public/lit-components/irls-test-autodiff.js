"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRLSAutodiffElement = exports.Box = void 0;
const lit_1 = require("lit");
const decorators_js_1 = require("lit/decorators.js");
const tad = __importStar(require("tadiff"));
class Box {
    constructor(x, y, w, h) {
        this.has_constrained_position = false;
        this.x_c = -1;
        this.y_c = -1;
        this.alignment_x_left = (box) => this.alignment_x_t(box, 0.0);
        this.alignment_x_center = (box) => this.alignment_x_t(box, 0.5);
        this.alignment_x_right = (box) => this.alignment_x_t(box, 1.0);
        this.alignment_x_left_autodiff = (box) => this.alignment_x_t_autodiff(box, 0.0);
        this.alignment_x_center_autodiff = (box) => this.alignment_x_t_autodiff(box, 0.5);
        this.alignment_x_right_autodiff = (box) => this.alignment_x_t_autodiff(box, 1.0);
        this.alignment_y_left = (box) => this.alignment_y_t(box, 0.0);
        this.alignment_y_center = (box) => this.alignment_y_t(box, 0.5);
        this.alignment_y_right = (box) => this.alignment_y_t(box, 1.0);
        this.alignment_y_left_autodiff = (box) => this.alignment_y_t_autodiff(box, 0.0);
        this.alignment_y_center_autodiff = (box) => this.alignment_y_t_autodiff(box, 0.5);
        this.alignment_y_right_autodiff = (box) => this.alignment_y_t_autodiff(box, 1.0);
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = Math.random() * 0xffffff | 0;
        this.offset = [0, 0];
    }
    clone() {
        return new Box(this.x, this.y, this.w, this.h);
    }
    overlaps(box) {
        const no_x_overlap = this.x > box.x + box.w || this.x + this.w < box.x;
        const no_y_overlap = this.y > box.y + box.h || this.y + this.h < box.y;
        return !(no_x_overlap || no_y_overlap);
    }
    overlap_area(box) {
        if (!this.overlaps(box))
            return 0;
        let overlap_left = Math.max(this.x, box.x);
        let overlap_right = Math.min(this.x + this.w, box.x + box.w);
        let overlap_top = Math.max(this.y, box.y);
        let overlap_bottom = Math.min(this.y + this.h, box.y + box.h);
        return (overlap_right - overlap_left) * (overlap_bottom - overlap_top);
    }
    overlap_area_autodiff(box) {
        if (!this.overlaps(box))
            return '0.0';
        let overlap_left = this.x > box.x ? `x` : `${box.x}`;
        let overlap_right = this.x + this.w < box.x + box.w ? `x + ${this.w}` : `${box.x + box.w}`;
        let overlap_top = this.y > box.y ? `y` : `${box.y}`;
        let overlap_bottom = this.y + this.h < box.y + box.h ? `y + ${this.h}` : `${box.y + box.h}`;
        let str = `(${overlap_right} - ${overlap_left}) * (${overlap_bottom} - ${overlap_top})`;
        return str;
    }
    overlap_xarea_autodiff(box) {
        if (!this.overlaps(box))
            return '0.0';
        let overlap_left = this.x > box.x ? `x` : `${box.x}`;
        let overlap_right = this.x + this.w < box.x + box.w ? `x + ${this.w}` : `${box.x + box.w}`;
        let str = `(${overlap_right} - ${overlap_left})`;
        return str;
    }
    overlap_yarea_autodiff(box) {
        if (!this.overlaps(box))
            return '0.0';
        let overlap_top = this.y > box.y ? `y` : `${box.y}`;
        let overlap_bottom = this.y + this.h < box.y + box.h ? `y + ${this.h}` : `${box.y + box.h}`;
        let str = `(${overlap_bottom} - ${overlap_top})`;
        return str;
    }
    alignment_x_t(box, t) {
        const this_centered_x = this.x + this.w * t;
        const box_centered_x = box.x + box.w * t;
        return Math.abs(this_centered_x - box_centered_x);
    }
    alignment_x_t_autodiff(box, t) {
        const this_centered_x = `x + ${this.w * t}`;
        const box_centered_x = `${box.x + box.w * t}`;
        return `abs(${this_centered_x} - ${box_centered_x})`;
    }
    alignment_y_t(box, t) {
        const this_centered_y = this.y + this.h * t;
        const box_centered_y = box.y + box.h * t;
        return Math.abs(this_centered_y - box_centered_y);
    }
    alignment_y_t_autodiff(box, t) {
        const this_centered_y = `y + ${this.h * t}`;
        const box_centered_y = `${box.y + box.h * t}`;
        return `abs(${this_centered_y} - ${box_centered_y})`;
    }
    compute_constrained_position(other_boxes) {
        let position = [this.x, this.y];
        const IRLS_iters = 50;
        const max_dist = 20;
        const constraints = [
            ...other_boxes.map(box => [100.0, (() => {
                    const expr = this.alignment_x_left_autodiff(box);
                    const constraint = tad.parseExpression(expr);
                    const vars = tad.getAllVariables(constraint);
                    const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    return [constraint, constraint_dx, constraint_dy];
                })(), (position) => {
                    const synthetic_box = box.clone();
                    synthetic_box.x = position[0];
                    synthetic_box.y = position[1];
                    return this.alignment_x_left(box) < max_dist;
                }]),
            ...other_boxes.map(box => [100.0, (() => {
                    const expr = this.alignment_x_right_autodiff(box);
                    const constraint = tad.parseExpression(expr);
                    const vars = tad.getAllVariables(constraint);
                    const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    return [constraint, constraint_dx, constraint_dy];
                })(), (position) => {
                    const synthetic_box = box.clone();
                    synthetic_box.x = position[0];
                    synthetic_box.y = position[1];
                    return this.alignment_x_right(box) < max_dist;
                }]),
            ...other_boxes.map(box => [100.0, (() => {
                    const expr = this.alignment_y_left_autodiff(box);
                    const constraint = tad.parseExpression(expr);
                    const vars = tad.getAllVariables(constraint);
                    const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    return [constraint, constraint_dx, constraint_dy];
                })(), (position) => {
                    const synthetic_box = box.clone();
                    synthetic_box.x = position[0];
                    synthetic_box.y = position[1];
                    return this.alignment_y_left(box) < max_dist;
                }]),
            ...other_boxes.map(box => [100.0, (() => {
                    const expr = this.alignment_y_right_autodiff(box);
                    const constraint = tad.parseExpression(expr);
                    const vars = tad.getAllVariables(constraint);
                    const constraint_dx = tad.getDerivativeForExpression(vars["x"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    const constraint_dy = tad.getDerivativeForExpression(vars["y"], tad.getAllDerivatives(constraint, new tad.Constant(1)));
                    return [constraint, constraint_dx, constraint_dy];
                })(), (position) => {
                    const synthetic_box = box.clone();
                    synthetic_box.x = position[0];
                    synthetic_box.y = position[1];
                    return this.alignment_y_right(box) < max_dist;
                }]),
        ];
        const get_state_cost = (position) => {
            let total_cost = 0;
            let costs = [];
            constraints.forEach(c_pair => {
                const constraint_weight = c_pair[0];
                const eval_context = {
                    variableValues: {
                        "x": position[0],
                        "y": position[1]
                    }
                };
                const current_constraint = c_pair[1][0];
                const constraint_cost = current_constraint.evaluate(eval_context);
                let cost = constraint_weight * constraint_cost;
                if (constraint_cost === Infinity && constraint_weight === 0)
                    cost = Infinity;
                if (cost !== Infinity)
                    total_cost += cost;
                costs.push(cost);
            });
            return [total_cost, costs];
        };
        const start_step = 5;
        const end_step = 1;
        const step_schedule = [];
        for (let i = 0; i < IRLS_iters; i++) {
            const t = (i / (IRLS_iters - 1)) ** 0.5;
            const step = start_step * (1 - t) + end_step * t;
            step_schedule.push(step);
        }
        console.log(step_schedule);
        let final_final_costs = [];
        for (let i = 0; i < step_schedule.length; i++) {
            // ATTEMPT 2
            // generate neighbors through grad descent
            const step = step_schedule[i];
            let total_dx = 0;
            let total_dy = 0;
            constraints.forEach(c => {
                const weight = c[0];
                const constraint_dx = c[1][1];
                const constraint_dy = c[1][2];
                const use_constraint = c[2](position);
                if (!use_constraint)
                    return;
                const eval_context = {
                    variableValues: {
                        "x": position[0],
                        "y": position[1]
                    }
                };
                const dx = constraint_dx.evaluate(eval_context);
                const dy = constraint_dy.evaluate(eval_context);
                // console.log(constraint.evaluateToString(), dx, dy)
                // console.log('dx', dx_function.evaluateToString())
                // console.log('dy', dy_function.evaluateToString())
                // console.log(position);
                total_dx += dx * weight ** 2;
                total_dy += dy * weight ** 2;
            });
            let grad_magnitude = Math.sqrt(total_dx ** 2 + total_dy ** 2);
            if (grad_magnitude !== 0) {
                position[0] += -step * total_dx / grad_magnitude;
                position[1] += -step * total_dy / grad_magnitude;
            }
            // update weights for IRLS
            const final_costs = get_state_cost(position)[1];
            final_final_costs = final_costs;
            constraints.map((c_pair, i) => {
                c_pair[0] = 1 / (1 + final_costs[i]);
            });
        }
        console.log('final weights:', constraints.map(c_pair => c_pair[0]));
        console.log('final costs:', final_final_costs, '\n');
        this.x_c = position[0];
        this.y_c = position[1];
        this.has_constrained_position = true;
    }
}
exports.Box = Box;
let IRLSAutodiffElement = class IRLSAutodiffElement extends lit_1.LitElement {
    constructor() {
        super(...arguments);
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this._active_box = -1;
        this._boxes = [];
        this._mousedown = false;
        this._lastRender = 0;
    }
    static { this.styles = (0, lit_1.css) `
    canvas {
        border: 1px solid black;
    }
    `; }
    render() {
        return (0, lit_1.html) `
            <canvas
                id="base"
                width=${this.canvasWidth}
                height=${this.canvasHeight}
            ></canvas>
        `;
    }
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
                if (in_x_range && in_y_range) {
                    this._active_box = i;
                    box.offset = [x - box.x, y - box.y];
                }
            });
        });
        this.canvas.addEventListener('mouseup', () => {
            this._mousedown = false;
            if (this._active_box !== -1) {
                const box = this._boxes[this._active_box];
                if (box.has_constrained_position) {
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
            if (this._active_box !== -1) {
                const box = this._boxes[this._active_box];
                const [x, y] = [event.offsetX, event.offsetY];
                box.x = x - box.offset[0];
                box.y = y - box.offset[1];
                const other_boxes = this._boxes.filter(b => b != box);
                box.compute_constrained_position(other_boxes);
            }
        });
        this._ctx = this.canvas.getContext('2d');
    }
    _loop(timestamp) {
        const progress = timestamp - this._lastRender;
        this._lastRender = timestamp;
        if (this._ctx) {
            this._ctx.save();
            this._ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.draw(this._ctx);
            this._ctx.restore();
        }
        requestAnimationFrame((timestamp) => this._loop(timestamp));
    }
    draw(ctx) {
        this._boxes.forEach((box, i) => {
            ctx.fillStyle = `#${box.color.toString(16).padStart(6, '0')}88`;
            ctx.fillRect(box.x, box.y, box.w, box.h);
            if (this._active_box === i) {
                ctx.strokeStyle = '#ff000088';
                ctx.lineWidth = 2;
                ctx.strokeRect(box.x, box.y, box.w, box.h);
                if (box.has_constrained_position) {
                    ctx.strokeStyle = '#0000ff88';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x_c, box.y_c, box.w, box.h);
                }
            }
        });
    }
};
exports.IRLSAutodiffElement = IRLSAutodiffElement;
__decorate([
    (0, decorators_js_1.query)('#base')
], IRLSAutodiffElement.prototype, "canvas", void 0);
exports.IRLSAutodiffElement = IRLSAutodiffElement = __decorate([
    (0, decorators_js_1.customElement)('irls-autodiff-element')
], IRLSAutodiffElement);
