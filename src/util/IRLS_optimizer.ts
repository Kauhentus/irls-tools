export type Vector = number[];

export type IRLS_optimizer_params = {
    initial_state: Vector;
    num_iterations: number;
    weight_epsilon: number;
    dimension: number;
    step_scheduler: (cur_iter: number, total_iter: number) => number;
}

export type IRLS_constraint = {
    use_constraint: (state: Vector) => boolean;
    cost: (state: Vector) => number; 
    gradient: (state: Vector) => Vector;
}

export class IRLS_optimizer {
    params: IRLS_optimizer_params;
    state: Vector;

    weights: number[];
    constraints: IRLS_constraint[];

    constructor(params: IRLS_optimizer_params){
        this.params = params;
        this.state = params.initial_state;

        this.weights = [];
        this.constraints = [];
    }

    add_constraint(weight: number, constraint: IRLS_constraint){
        this.weights.push(weight);
        this.constraints.push(constraint);
    }

    optimize(){
        let state = this.state;

        for(let i = 0; i < this.params.num_iterations; i++){
            let step = this.params.step_scheduler(i, this.params.num_iterations);
            let total_grad: Vector = new Array(this.params.dimension).fill(0);

            for(let j = 0; j < this.constraints.length; j++){
                let cur_weight = this.weights[j];
                let cur_constraint = this.constraints[j];
                let use_constraint = cur_constraint.use_constraint(state);
                if(!use_constraint) continue;

                let cur_cost = cur_constraint.cost(state);
                let cur_grad = cur_constraint.gradient(state);
                let new_weight = 1 / (cur_cost + this.params.weight_epsilon);
                this.weights[j] = new_weight;
                
                for(let k = 0; k < this.params.dimension; k++){
                    total_grad[k] += cur_weight * cur_grad[k];
                }
            }

            let total_grad_magnitude = Math.sqrt(total_grad.reduce((a, b) => a + b * b, 0));
            if(total_grad_magnitude !== 0){
                for(let k = 0; k < this.params.dimension; k++){
                    state[k] += -step * total_grad[k] / total_grad_magnitude;
                }
            }
        }

        this.state = state;
        return this.state;
    }
}