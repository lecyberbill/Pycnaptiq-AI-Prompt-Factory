class HistoryManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50; // Limit history size
    }

    /**
     * Pushes a new state onto the history stack.
     * If the current index is not at the end of the history, it means
     * a user has undone actions, and any new action should clear
     * the "future" history.
     * @param {object} state - The state to save. This should be a deep copy of the relevant canvas state.
     */
    pushState(state) {
        // Deep copy the state to prevent mutation
        const newState = JSON.parse(JSON.stringify(state));

        // If we are not at the end of the history, clear all subsequent states
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Add the new state
        this.history.push(newState);
        this.currentIndex++;

        // Enforce max history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift(); // Remove the oldest state
            this.currentIndex--;
        }

        console.log("State pushed. History size:", this.history.length, "Current index:", this.currentIndex);
        console.log("Pushed State:", newState);
    }

    /**
     * Returns the previous state if available, and decrements the current index.
     * @returns {object|null} The previous state, or null if no previous state.
     */
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            const stateToRestore = this.history[this.currentIndex];
            console.log("Undo. History size:", this.history.length, "Current index:", this.currentIndex);
            console.log("Restoring State:", stateToRestore);
            return stateToRestore;
        }
        console.log("Cannot undo. At initial state.");
        return null;
    }

    /**
     * Returns the next state if available, and increments the current index.
     * @returns {object|null} The next state, or null if no next state.
     */
    redo() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            console.log("Redo. History size:", this.history.length, "Current index:", this.currentIndex);
            return this.history[this.currentIndex];
        }
        console.log("Cannot redo. History size:", this.history.length, "Current index:", this.currentIndex);
        return null;
    }

    /**
     * Checks if an undo operation is possible.
     * @returns {boolean} True if undo is possible, false otherwise.
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Checks if a redo operation is possible.
     * @returns {boolean} True if redo is possible, false otherwise.
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Clears the history.
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
        console.log("History cleared.");
    }
}

// The singleton instance will be created in main.js after the initial state is known.
export { HistoryManager };
