"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyElement = void 0;
const lit_1 = require("lit");
const decorators_js_1 = require("lit/decorators.js");
let MyElement = class MyElement extends lit_1.LitElement {
    constructor() {
        super(...arguments);
        this.name = 'world';
        this.checked = false;
        this.hideCompleted = false;
        this._listItems = [
            { text: 'Start Lit tutorial', completed: true },
            { text: 'Make to-do list', completed: false }
        ];
    }
    static { this.styles = (0, lit_1.css) `
    .completed {
        text-decoration-line: line-through;
        color: #777;
    }
    `; }
    changeName(event) {
        const input = event.target;
        this.name = input.value;
    }
    setChecked(event) {
        this.checked = event.target.checked;
    }
    render() {
        const items = this.hideCompleted
            ? this._listItems.filter((item) => !item.completed)
            : this._listItems;
        const todos = (0, lit_1.html) ` 
            <ul>
              ${items.map((item) => (0, lit_1.html) `
                  <li
                      class=${item.completed ? 'completed' : ''}
                      @click=${() => this.toggleCompleted(item)}>
                    ${item.text}
                  </li>`)}
            </ul>
        `;
        const caughtUpMessage = (0, lit_1.html) `
            <p>
            You're all caught up!
            </p>
        `;
        const todosOrMessage = items.length > 0 ?
            todos : caughtUpMessage;
        return (0, lit_1.html) `
            <p>Hello ${this.name}!</p>
            <input @input=${this.changeName} ?disabled=${!this.checked} placeholder="Enter your name">
            <label><input type="checkbox" @change=${this.setChecked}> Enable editing</label>

            <h2>To Do</h2>
            <ul>
            ${todosOrMessage}
            <input id="newitem" aria-label="New item">
            <button @click=${this.addToDo}>Add</button>
            <br>
            <label>
                <input type="checkbox"
                @change=${this.setHideCompleted}
                ?checked=${this.hideCompleted}>
                Hide completed
            </label>
        `;
    }
    toggleCompleted(item) {
        item.completed = !item.completed;
        this.requestUpdate();
    }
    setHideCompleted(e) {
        this.hideCompleted = e.target.checked;
    }
    addToDo() {
        this._listItems = [
            ...this._listItems,
            { text: this.input.value, completed: false }
        ];
        this.input.value = '';
    }
};
exports.MyElement = MyElement;
__decorate([
    (0, decorators_js_1.property)()
], MyElement.prototype, "name", void 0);
__decorate([
    (0, decorators_js_1.property)()
], MyElement.prototype, "checked", void 0);
__decorate([
    (0, decorators_js_1.property)()
], MyElement.prototype, "hideCompleted", void 0);
__decorate([
    (0, decorators_js_1.state)()
], MyElement.prototype, "_listItems", void 0);
__decorate([
    (0, decorators_js_1.query)('#newitem')
], MyElement.prototype, "input", void 0);
exports.MyElement = MyElement = __decorate([
    (0, decorators_js_1.customElement)('my-element')
], MyElement);
