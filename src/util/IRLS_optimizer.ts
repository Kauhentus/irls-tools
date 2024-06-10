import * as tad from 'tadiff';
import { normalize } from './math';
import * as d3 from 'd3';

export type Vector = number[];

export type IRLSOptimizerParams = {
    initial_state: Vector;
    num_iterations: number;
    weight_epsilon: number;
    dimension: number;
    step_scheduler: (cur_iter: number, total_iter: number) => number;
}

export type IRLSConstraint<T> = {
    use_constraint: (state: Vector, memo: T) => boolean;
    memo: (state: Vector) => T;
    cost: (state: Vector, memo: T) => number; 
    gradient: (state: Vector, memo: T) => Vector;
    label?: string;
}

export class IRLSOptimizer<T> {
    params: IRLSOptimizerParams;
    state: Vector;

    weights: number[];
    constraints: IRLSConstraint<T>[];
    memo: T[];

    constructor(params: IRLSOptimizerParams){
        this.params = params;
        this.state = params.initial_state;

        this.weights = [];
        this.constraints = [];
        this.memo = [];
    }

    add_constraint(weight: number, constraint: IRLSConstraint<T>){
        this.weights.push(weight);
        this.constraints.push(constraint);
        this.memo.push(constraint.memo(this.state));
    }

    optimize(){
        let state = this.state;

        for(let i = 0; i < this.params.num_iterations; i++){
            let step = this.params.step_scheduler(i, this.params.num_iterations);
            let total_grad: Vector = new Array(this.params.dimension).fill(0);
            let grad_components: any[] = [];
            let weight_components: any[] = [];
            let cost_components: any[] = [];

            for(let j = 0; j < this.constraints.length; j++){
                let cur_weight = this.weights[j];
                let cur_constraint = this.constraints[j];
                let cur_memo = this.memo[j];
                let use_constraint = cur_constraint.use_constraint(state, cur_memo);
                if(!use_constraint) continue;

                let cur_cost = cur_constraint.cost(state, cur_memo);
                let cur_grad = cur_constraint.gradient(state, cur_memo);
                
                for(let k = 0; k < this.params.dimension; k++){
                    total_grad[k] += cur_weight * cur_grad[k];
                }
                grad_components.push(cur_grad[0]);
                weight_components.push(cur_weight);
                cost_components.push(cur_cost);

                let new_weight = 1 / (cur_cost + this.params.weight_epsilon);
                this.weights[j] = new_weight;
            }
            // console.log('G', grad_components)
            // console.log('W', normalize(weight_components))
            // console.log('C', cost_components);

            let total_grad_magnitude = Math.sqrt(total_grad.reduce((a, b) => a + b * b, 0));
            let prev_state = state.slice(0);
            if(total_grad_magnitude !== 0){
                for(let k = 0; k < this.params.dimension; k++){
                    state[k] += -step * total_grad[k] / total_grad_magnitude;
                }
            }
            // console.log(prev_state, '->', state, -step * total_grad[0] / total_grad_magnitude)
            // console.log('')
        }

        let active_constraints: IRLSConstraint<T>[] = [];
        for(let i = 0; i < this.constraints.length; i++){
            const c = this.constraints[i];
            if(c.use_constraint(state, this.memo[i])) {
                active_constraints.push(c);
                // this.plot_1D_constraint_cost(i, 30000, 50000, 100)
            }
        }
        console.log(active_constraints.map(c => c.label))
        // active_constraints.forEach((c, i) => this.plot_1D_constraint_cost(i, 0, 50000, 1000))

        this.state = state;
        return this.state;
    }

    plot_1D_constraint_cost(index: number, min: number, max: number, step: number){
        const margin = { top: 20, right: 30, bottom: 40, left: 100 };
        const width = 600 - margin.left - margin.right;
        const height = 200 - margin.top - margin.bottom;
        
        const c = this.constraints[index];
        const dataPoints: [number, number][] = [];
        for(let t = min; t <= max; t += step){
            dataPoints.push([t, c.cost([t], this.memo[index])]);
        }

        const xScale = d3.scaleLinear()
            .domain([
                Math.min(...dataPoints.map(dp => dp[0])), 
                Math.max(...dataPoints.map(dp => dp[0]))
            ]) // Adjust domain based on your data
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
            .text(`cost of constraint ${index}`);
    }
}