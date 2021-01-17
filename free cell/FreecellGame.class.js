// Model implementation for a game of Freecell, having foundation, open, and cascade piles.
// Enforces the rules of the game, executes moves, and reports on game state.
// "private" methods that the controller and view do not depend on have names starting with _
class FreecellGame {
    constructor(numOpen, numCascade) {
        if (isNaN(parseInt(numOpen, 10)) || numOpen < 1 || numOpen > 52) {
            throw "Invalid number of open piles: " + numOpen;
        }
        if (isNaN(parseInt(numCascade, 10)) || numCascade < 1 || numCascade > 52) {
            throw "Invalid number of cascade piles: " + numCascade;
        }
    [numOpen, numCascade] = [parseInt(numOpen, 10), parseInt(numCascade, 10)];
        this.foundation = [];
        for (var k = 0; k < 4; k++) {
            this.foundation.push([]);
        }
        this.open = [];
        for (var k = 0; k < numOpen; k++) {
            this.open.push([]);
        }
        var deck = getDeck();
        this.cascade = [];
        for (var k = 0; k < numCascade; k++) {
            this.cascade.push([]);
        }
        for (var i = 0; i < deck.length; i++) {
            this.cascade[i % numCascade].push(deck[i]);
        }
    }

    getNumCascade() {
        return this.cascade.length;
    }
    getNumOpen() {
        return this.open.length;
    }
    getFoundation() {
        return this.foundation.map(p => p.slice());
    }
    getOpen() {
        return this.open.map(p => p.slice());
    }
    getCascade() {
        return this.cascade.map(p => p.slice());
    }

    // execute a move from srcPile, e.g. {type:"cascade", index: 0, cardIndex, 5}
    // to destPile, e.g. {type:"open", index: 3}
    // mutates the game state.
    executeMove(srcPile, destPile) {

        // If the move is not a valid move, return null
        if (!this.isValidMove(srcPile, destPile)) {
            return null;
        }

        // Else if the move is from cascade
        if (srcPile.type == "cascade") {

            // The move is to a cascade
            if (destPile.type == "cascade") {

                // Delete and pop all the cascade to update it
                var originalLength = this.cascade[srcPile.index].length;
                for (var i = srcPile.cardIndex; i < originalLength; i++) {
                    this.cascade[destPile.index].push(this.cascade[srcPile.index][i]);
                }
                for (var i = srcPile.cardIndex; i < originalLength; i++) {
                    this.cascade[srcPile.index].pop();
                }


                // If the move is to the open, add and remove to update
            } else if (destPile.type == "open") {
                this.open[destPile.index].push(this.cascade[srcPile.index].pop());

                // If the move is to the foundation, add and remove to update
            } else {
                this.foundation[destPile.index].push(this.cascade[srcPile.index].pop());
            }
        }

        // Else if teh move is from open
        if (srcPile.type == "open") {

            // Update the pile.
            if (destPile.type == "cascade") {
                this.cascade[destPile.index].push(this.open[srcPile.index].pop());
            } else if (destPile.type == "open") {
                this.open[destPile.index].push(this.open[srcPile.index].pop());
            } else {
                this.foundation[destPile.index].push(this.open[srcPile.index].pop());
            }
        }

        return true;

        // .pop(): remove and return last element of array
        // .push(arg): add arg to end of array
    }

    // attempt to stick the given card on either a foundation or an open
    // by finding whatever foundation pile is valid, or the first open pile.
    // return true if success, false if no automatic move available
    // mutates the game state if a move is available.
    attemptAutoMove(srcPile) {

        // Try to execute the move and if it does not fail, do it.
        if (this.getValidFoundation(srcPile) != null) {

            this.executeMove(srcPile, {
                type: "foundation",
                index: this.getValidFoundation(srcPile)
            });
            return true;

            // Else if there is an opening, do it.
        } else if (this.getFirstAvailableOpen() != null) {
            this.executeMove(srcPile, {
                type: "open",
                index: this.getFirstAvailableOpen()
            });
            return true;

            // Else return false.
        } else {
            return false;
        }
    }

    // return index of first valid foundation destination for the given card,
    // or anything else if there is no valid foundation destination
    getValidFoundation(srcPile) {

        // For every foundation pile there is.
        for (var i = 0; i < 4; i++) {
            // If the foundation is empty, check to see if the given card is 13

            if (this.foundation[i].length == 0) {
                if (this._getLastCard(srcPile).getValue() == 1) {
                    return i;
                }

                // Check to see if the foundation is one greater than the the new card and has the same suit.
            } else if ((this.foundation[i][this.foundation[i].length - 1].getSuit() == this._getLastCard(srcPile).getSuit()) && (this.foundation[i][this.foundation[i].length - 1].value + 1 == this._getLastCard(srcPile).getValue())) {
                return i;
            }
        }
        return null;
    }

    // return index of first empty open pile
    // or anything else if no empty open pile
    getFirstAvailableOpen() {

        // Check to see if there are openings.
        for (var i = 0; i < this.getNumOpen(); i++) {
            if (this.open[i].length == 0) {
                return i;
            }
        }
        return null;
    }

    // return true if in the given cascade pile, starting from given index, there is a valid "build"
    isBuild(pileIdx, cardIdx) {
        var size = this.cascade[pileIdx].length;
        for (var i = cardIdx; i < size - 1; i++) {
            if (!FreecellGame._isStackable(this.cascade[pileIdx][i], this.cascade[pileIdx][i + 1])) {
                return false;
            }
        }

        return true;
    }

    // return true if the move from srcPile to destPile would be valid, false otherwise.
    // does NOT mutate the model.
    isValidMove(srcPile, destPile) {
        if (!srcPile || !destPile || (srcPile.type == destPile.type && srcPile.index == destPile.index) || srcPile.type == "foundation") {
            return false;
        }

        // If the source is from cascade...
        if (srcPile.type == "cascade") {
            var currentSize = this.cascade[srcPile.index].length - srcPile.cardIndex;

            // If the destination is cascde...
            if (destPile.type == "cascade") {

                // If the number that is being carried is greater than capacity, return false.
                if (this._numCanMove(destPile.index) < currentSize) {
                    return false;

                    // Else, check to see if the new card is stackable with old card.
                } else {
                    if (this._getLastCard(destPile) == null) {
                        return true;
                    }
                    return FreecellGame._isStackable(this._getLastCard(destPile), this.cascade[srcPile.index][srcPile.cardIndex]);
                }

                // If the destination is open...
            } else if (destPile.type == "open") {

                // Check to see if there are openings and only one card is being carried
                return (this.getFirstAvailableOpen != null && currentSize == 1);

                // If the destination is foundation...
            } else {

                // Check to see if there are foundations and only one card is being carried
                return (this.getValidFoundation(srcPile) != null && currentSize == 1);
            }

        } else if (srcPile.type == "open") {

            if (destPile.type == "cascade") {

                if (this._getLastCard(destPile) == null) {
                    return true;
                }
                return FreecellGame._isStackable(this._getLastCard(destPile), this._getLastCard(srcPile));
            } else if (destPile.type == "open") {
                return this.getFirstAvailableOpen != null;
            } else {
                return this.getValidFoundation(srcPile) != null;
            }
        } else {
            return false;
        }
    }

    // suggested private methods
    _numCanMove(destPileIndex) {
        var numOpen = this.open.reduce((sum, c) => c.length == 0 ? sum + 1 : sum, 0);
        var numEmptyCascade = this.cascade.reduce((sum, c) => c.length == 0 ? sum + 1 : sum, 0);
        if (this.cascade[destPileIndex].length == 0) {
            numEmptyCascade--; // subtract one empty pile if destination is empty
            //   // this is technically a rule of freecell though we glossed over it on HW4
        }
        return (numOpen + 1) * Math.pow(2, numEmptyCascade);
    }

    // A function that would return the last card.
    _getLastCard(pile) {
        if (pile.type == "foundation") {
            return this.foundation[pile.index][this.foundation[pile.index].length - 1];
        } else if (pile.type == "open") {
            return this.open[pile.index][this.open[pile.index].length - 1];
        } else {
            return this.cascade[pile.index][this.cascade[pile.index].length - 1];
        }
    }

    // is overCard stackable on top of underCard, according to solitaire red-black rules
    static _isStackable(underCard, overCard) {
        return underCard.getValue() - 1 == overCard.getValue() && overCard.isBlack() != underCard.isBlack();
    }
}

// generate and return a shuffled deck (array) of Cards.
function getDeck() {
    var deck = [];
    var suits = ["spades", "clubs", "diamonds", "hearts"];
    for (var v = 13; v >= 1; v--) {
        for (s in suits) {
            deck.push(new Card(v, suits[s]));
        }
    }
    shuffle(deck); // comment out this line to not shuffle
    return deck;
}

// shuffle an array: mutate the given array to put its values in random order
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        // Pick a remaining element...
        let j = Math.floor(Math.random() * (i + 1));
        // And swap it with the current element.
    [array[i], array[j]] = [array[j], array[i]];
    }
}
