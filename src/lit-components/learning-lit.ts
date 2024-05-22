import {LitElement, PropertyValueMap, css, html} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';


type ToDoItem = {
    text: string,
    completed: boolean
}

@customElement('my-element')
export class MyElement extends LitElement {
    @property()
    name: string = 'world';
    @property()
    checked: boolean = false;
    @property()
    hideCompleted = false;

    @state()
    private _listItems = [
        { text: 'Start Lit tutorial', completed: true },
        { text: 'Make to-do list', completed: false }
    ];

    @query('#newitem')
    input!: HTMLInputElement;

    static styles = css`
    .completed {
        text-decoration-line: line-through;
        color: #777;
    }
    `;

    changeName(event: Event){
        const input = event.target as HTMLInputElement;
        this.name = input.value;
    }

    setChecked(event: Event) {
        this.checked = (event.target as HTMLInputElement).checked;
    }

    render(){
        const items = this.hideCompleted
            ? this._listItems.filter((item) => !item.completed)
            : this._listItems;
        const todos = html` 
            <ul>
              ${items.map((item) =>
                html`
                  <li
                      class=${item.completed ? 'completed' : ''}
                      @click=${() => this.toggleCompleted(item)}>
                    ${item.text}
                  </li>`
              )}
            </ul>
        `;
        const caughtUpMessage = html`
            <p>
            You're all caught up!
            </p>
        `;
        const todosOrMessage = items.length > 0 ? 
            todos : caughtUpMessage;

        return html`
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

    toggleCompleted(item: ToDoItem) {
        item.completed = !item.completed;
        this.requestUpdate();
    }

    setHideCompleted(e: Event) {
        this.hideCompleted = (e.target as HTMLInputElement).checked;
    }

    addToDo() {
        this._listItems = [
            ...this._listItems,
            {text: this.input.value, completed: false}
        ];
        this.input.value = '';
    }
}
