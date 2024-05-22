import {LitElement, PropertyValueMap, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';

export { MyElement } from './lit-components/learning-lit';
export { IRLSElement } from './lit-components/irls-test';

import * as tad from 'tadiff';

// const expr = tad.parseExpression("4 * exp(a * b) / abs(tan(b))")
// const vars = tad.getAllVariables(expr)
// const evalContext = {
//     variableValues: {
//         "a": 2,
//         "b": 3
//     }
// }
// console.log(expr.evaluate(evalContext), 'from', expr.evaluateToString())

// const derivativeA = tad.getDerivativeForExpression(vars["a"], tad.getAllDerivatives(expr, new tad.Constant(1)))
// const derivativeB = tad.getDerivativeForExpression(vars["b"], tad.getAllDerivatives(expr, new tad.Constant(1)))
// console.log()
// console.log(derivativeA.evaluate(evalContext), 'from', derivativeA.evaluateToString())
// console.log(derivativeB.evaluate(evalContext), 'from', derivativeB.evaluateToString())