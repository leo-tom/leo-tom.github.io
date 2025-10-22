//const DIFFICULTY_CONST = 128;
const DIFFICULTY_CONST = 5;

//const DIFFICULTY = 20;

const VOICE_ID_WIN = ["win01","win02","win03"];
const VOICE_ID_LOST = ["lost01","lost02","lost03"];
const VOICE_ID_START = ["start01","start02","start03"];
const VOICE_ID_PUT_NORMAL = ["putNormal01","putNormal02","putNormal03","putNormal04","putNormal05"];
const VOICE_ID_PUT_WINNING = ["putWinning01","putWinning02","putWinning03","putWinning04","putWinning05"];
const VOICE_ID_PUT_LAUGHING = ["putLaughing01","putLaughing02","putLaughing03","putLaughing04","putLaughing05"];
const VOICE_ID_PUT_LOSING = ["putLosing01","putLosing02","putLosing03"];
const VOICE_ID_PUT_CRYING = ["putCrying01","putCrying02","putCrying03"];
const VOICE_ID_THINKING = ["thinking01","thinking02","thinking03"];

class Board{
    
    constructor(){
        this.cells = Array(8).fill(0);
        this._put(3,3,'o');
        this._put(4,4,'o');
        this._put(3,4,'*');
        this._put(4,3,'*');
    }
    _put(r,c,player){
        const bitSelf  = 1 << (player === '*' ? c : (c + 8));
        const bitOther = 1 << (player === '*' ? (c + 8) : c);
        this.cells[r] = (this.cells[r] & (~bitOther)) | bitSelf;
    }
    _get(r,c){
        if((this.cells[r] & (1 << c)) !== 0) return '*';
        if((this.cells[r] & (1 << (c + 8))) !== 0) return 'o';
        return ' ';
    }
    duplicate(){
        let newBoard = new Board();
        newBoard.cells = this.cells.slice();
        return newBoard;
    }
    put(r,c,player,flip=true){
        if(this._get(r,c) !== ' ') return false;
        const opponent = player === 'o' ? '*' : 'o';
        let total_flip = 0;
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],          [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];
        for(const [dr, dc] of directions){
            let nr = r + dr;
            let nc = c + dc;
            let toFlip = [];
            while(nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this._get(nr,nc) === opponent){
                toFlip.push([nr, nc]);
                nr += dr;
                nc += dc;
            }
            if(nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this._get(nr,nc) === player && toFlip.length > 0){
                total_flip += toFlip.length;
                if(flip){
                    for(const [fr, fc] of toFlip){
                        this._put(fr, fc, player);
                    }
                }
            }
        }
        if(flip){
            this._put(r, c, player);
        }
        return total_flip;
    }
    calculate_n_next_moves(player){
        let n_next_moves = 0;
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(this._get(r,c) === ' '){
                    if(this.put(r,c,player,false)){
                        n_next_moves++;
                    }
                }
            }
        }
        return n_next_moves;
    }
    _calculate_edgeScore(player){
        let edge_score = 0;
        const yosumi_char = [this._get(0,0), this._get(0,7), this._get(7,7), this._get(7,0)];
        const lines = [
            {coords: i => [0, i], cornerIdx: 0},
            {coords: i => [i, 0], cornerIdx: 0},
            {coords: i => [i, 7], cornerIdx: 1},
            {coords: i => [0, 7-i], cornerIdx: 1},
            {coords: i => [7-i, 7], cornerIdx: 2},
            {coords: i => [7, 7-i], cornerIdx: 2},
            {coords: i => [7, i], cornerIdx: 3},
            {coords: i => [7-i, 0], cornerIdx: 3},
        ];
        let self_score = 0;
        let opponent_score = 0;
        for (const {coords, cornerIdx} of lines) {
            const corner = yosumi_char[cornerIdx];
            for (let i = 0; i < 8; i++) {
                const [r, c] = coords(i);
                const v = this._get(r, c);
                if (v === ' ' || v !== corner){
                    break;
                }
                if(v === player){
                    self_score += (8 - i) / 8;
                }else{
                    opponent_score += (8 - i) / 8;
                }
            }
        }
        let result =  Math.log10((self_score + 1) / (opponent_score + 1));
        if(isNaN(result)){
            console.log("NaN detected in _calculate_edgeScore");
        }
        return result;
    }
    _score(player){
        if(this.isPuttable(player) === false){
            return this._score(player === 'o' ? '*' : 'o').map(v => -v);
        }
        return [this.calculate_n_next_moves(player),this._calculate_edgeScore(player)];
    }
    score(player){
        const opponent = player === 'o' ? '*' : 'o';
        let isGameFinished = true;
        let opponent_n_next_moves_ave = 0;
        let least_opponent_edge_score = 420*420;
        let n_next_moves = 0;
        let n_my_pieces = 0;
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                const piece = this._get(r,c);
                if(piece === ' '){
                    if(this.put(r,c,player,false)){
                        isGameFinished = false;
                        n_next_moves += 1;
                        const newBoard = this.duplicate();
                        newBoard.put(r,c,player);
                        if(newBoard.isGameOver()){
                            let n_player_pieces = newBoard.countPieces(PLAYER_CHAR);
                            let n_ai_pieces = newBoard.countPieces(AI_CHAR);
                            if(n_player_pieces > n_ai_pieces){
                                return -10;
                            }else if(n_player_pieces < n_ai_pieces){
                                return 10;
                            }else{
                                return -1;
                            }
                        }
                        const [opponent_n_next_moves, opponent_edge_score] = newBoard._score(opponent);
                        opponent_n_next_moves_ave += opponent_n_next_moves;
                        if(opponent_edge_score < least_opponent_edge_score){
                            least_opponent_edge_score = opponent_edge_score;
                        }
                    }else if(isGameFinished){
                        if(this.put(r,c,opponent,false)){
                            isGameFinished = false;
                        }
                    }
                }else if(piece === player){
                    n_my_pieces += 1;
                }
            }
        }
        if(isGameFinished){
            const n_opponent_pieces = this.countPieces(opponent);
            if(n_my_pieces > n_opponent_pieces){
                return 10;
            }else if(n_my_pieces < n_opponent_pieces){
                return -10;
            }else{
                return -0.1;
            }
        }
        if(n_next_moves === 0){
            // player has to pass.
            return -this.score(opponent);
        }
        opponent_n_next_moves_ave /= n_next_moves;
        if(opponent_n_next_moves_ave <= 0){
            n_next_moves += - opponent_n_next_moves_ave;
            opponent_n_next_moves_ave = 0.1;
        }
        let score_next_moves = Math.log10((n_next_moves + 1) / (opponent_n_next_moves_ave + 1));
        if(!isFinite(score_next_moves)){
            score_next_moves = Math.log10((n_next_moves + 1) / (opponent_n_next_moves_ave + 0.1));
        }
        const bunshi = (this._calculate_edgeScore(player) + 0.001);
        const retval =  score_next_moves + least_opponent_edge_score;
        if(isNaN(retval)){
            console.log("NaN detected in score()");
        }
        return retval;
    }
    print2Console(){
        for(let r=0; r<8; r++){
            let rowStr = "";
            for(let c=0; c<8; c++){
                rowStr += this._get(r,c);
            }
            console.log(rowStr);
        }
    }
    isPuttable(player){
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(this._get(r,c) === ' '){
                    if(this.put(r,c,player,false)){
                        return true;
                    }
                }
            }
        }
        return false;
    }
    isGameOver(){
        return !this.isPuttable('o') && !this.isPuttable('*');
    }
    countPieces(player){
        let count = 0;
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(this._get(r,c) === player){
                    count++;
                }
            }
        }
        return count;
    }
    setList(list,player,renderScore=false){
        this.render = Array(8).fill(null).map(() => Array(8).fill(""));
        if(renderScore){
            this.renderColor = "red";
        }else{
            this.renderColor = "blue";
        }
        for(const [r, c, val] of list){
            if(renderScore){
                if(val === Number.POSITIVE_INFINITY){
                    this.render[r][c] = "∞";
                }else if(val === Number.NEGATIVE_INFINITY){
                    this.render[r][c] = "-∞";
                }else{
                    this.render[r][c] = val.toFixed(1);
                }
            }else{
                this.render[r][c] = this.put(r,c,player,false) + "";
            }
        }
    }
};

class Node{
    
    constructor(board, player,depth = -1){
        this.board = board;
        if(depth < 0){
            this.depth = this.board.countPieces(AI_CHAR) + this.board.countPieces(PLAYER_CHAR);
        }else{
            this.depth = depth;
        }
        
        this.gameFinished = 0;
        this.score = 0;
        this.searched = false;
        this.n_descendant = 0;
        this.player = player;
        if(this.board.isGameOver()){
            this.gameFinished = this.board.countPieces(AI_CHAR) - this.board.countPieces(PLAYER_CHAR);
            if(this.gameFinished === 0){
                this.gameFinished = -1; // draw is slightly negatives
                this.score = -1;
            }else if(this.gameFinished > 0){
                this.score = 10;
            }else{
                this.score = -10;
            }
            this.searched = true;
            this.n_descendant = 1;
            this.winGuaranteed = this.score > 0;
        }else{
            this.list = this.getList();
            this.estimated_score = new Array(this.list.length).fill(0);
            const next_player = this.player === 'o' ? '*' : 'o';
            for (let index= 0; index < this.list.length; index++){
                let [r,c,child] = this.list[index];
                const newBoard = this.board.duplicate();
                newBoard.put(r,c,this.player);
                this.estimated_score[index] = newBoard.score(next_player);
                this.estimated_score[index] *= this.player === AI_CHAR ? 1 : -1;
                if(isNaN(this.estimated_score[index])){
                    this.board.print2Console();
                    console.log("NaN detected in estimated_score");
                    newBoard.print2Console();
                }
            }
        }
        
        
        
    }
    getList(){
        const list = [];
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(this.board._get(r,c) === ' '){
                    if(this.board.put(r, c, this.player, false)){
                        list.push([r, c, null]);
                    }
                }
            }
        }
        return list;
    }
    static normalizeList(scores) {
        let minScore = Infinity;
        for (let i = 0; i < scores.length; i++) {
            const v = scores[i][0];
            if (v < minScore){
                minScore = v;
            }
        }

        let total = 0;
        for (let i = 0; i < scores.length; i++) {
            const v = scores[i][0];
            scores[i][0] = v - minScore + 1;
            total += scores[i][0];
        }

        const invTotal = 1 / total;
        for (let i = 0; i < scores.length; i++) {
            scores[i][0] *= invTotal;
        }
        return scores;
    }
    static rouletteSelect(probs){
        const rndVal = Math.random();
        let cumulative = 0;
        for(let i=0; i<probs.length; i++){
            cumulative += probs[i][0];
            if(rndVal < cumulative){
                return probs[i][1];
            }
        }
        return null; // Should not reach here
    }
    scoreSelect(){
        const factor = this.player === AI_CHAR ? 1 : -1;
        const scores = [];
        for (let i = 0; i < this.list.length; i++) {
            const x = this.list[i];
            if (x[2] != null && !x[2].searched){
                scores.push([factor * x[2].score,x[2]]);
            }
        }
        if(scores.length === 0){
            return null;
        }else if(scores.length === 1){
            //this happens frequently in early game
            return scores[0][1];
        }
        return Node.rouletteSelect(Node.normalizeList(scores));
    }
    minimaxSelect(){
        let best_score = this.player === AI_CHAR ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
        let best_child = null;
        let best_index = -1;
        for (let i = 0; i < this.list.length; i++) {
            const x = this.list[i];
            if (x[2] != null){
                if(best_child === null){
                    best_child = x[2];
                }else{
                    if(this.player === AI_CHAR){
                        if(x[2].score > best_score){
                            best_score = x[2].score;
                            best_child = x[2];
                        }
                    }else{
                        if(x[2].score < best_score){
                            best_score = x[2].score;
                            best_child = x[2];
                        }
                    }
                }
            }
        }
        if(best_child === null){
            // get_a_child is minimax selection.
            best_child = this.get_a_child(true);
        }
        return best_child;
    }
    get_n_null_children(){
        let n_null_children = 0;
        for(let index = 0; index < this.list.length; index++){
            let [r,c,child] = this.list[index];
            if(child === null){
                n_null_children += 1;
            }
        }
        return n_null_children;
    }
    get_a_child(forceNullkill = false){
        const n_null_children = this.get_n_null_children();
        if(forceNullkill || n_null_children === this.list.length || (n_null_children > 0 ) ){
            let chosen_index = -1;
            let next_move_score = this.player === AI_CHAR ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
            const next_player = this.player === 'o' ? '*' : 'o';
            for (let index= 0; index < this.list.length; index++){
                let [r,c,child] = this.list[index];
                if(child === null){
                    if(this.player === AI_CHAR){
                        if(this.estimated_score[index] > next_move_score){
                            next_move_score = this.estimated_score[index];
                            chosen_index = index;
                        }
                    }else{
                        if( this.estimated_score[index] < next_move_score){
                            next_move_score = this.estimated_score[index];
                            chosen_index = index;
                        }
                    }
                }
            }
            if(chosen_index >= 0){
                let [r,c,child] = this.list[chosen_index];
                const newBoard = this.board.duplicate();
                newBoard.put(r,c,this.player);
                if(newBoard.isPuttable(next_player)){
                    child = new Node(newBoard, next_player,this.depth + 1);
                }else{
                    child = new Node(newBoard, this.player,this.depth + 1);
                }
                this.list[chosen_index][2] = child;
                child.newBorn = true;
                return child;
            }
        }
        let selected_child = this.scoreSelect();
        if(selected_child === null){
            //console.log(this);
            return null;
        }
        selected_child.newBorn = false;
        return selected_child;
    }
    calculateScore(){
        let decisive = this.iswinGuaranteed();
        if(decisive !== undefined){
            if(decisive){
                return this.score = 10;
            }else{
                return this.score = -10;
            }
        }

        // normal score calculation
        this.score = 0;
        let likely_to_be_chosen = AI_CHAR === this.player ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
        let likely_to_be_chosen_index = -1;
        this.n_descendant = 1;
        if(this.get_n_null_children() === this.list.length){
            for(let index = 0; index < this.list.length; index++){
                if(this.player === AI_CHAR){
                    if(this.estimated_score[index] > likely_to_be_chosen){
                        likely_to_be_chosen = this.estimated_score[index];
                        likely_to_be_chosen_index = index;
                    }
                }else{
                    if( this.estimated_score[index] < likely_to_be_chosen){
                        likely_to_be_chosen = this.estimated_score[index];
                        likely_to_be_chosen_index = index;
                    }
                }
                //this.score += this.estimated_score[index] / this.list.length;
            }
        }else{
            for(let index = 0; index < this.list.length; index++){
                let [r,c,child] = this.list[index];
                if(child){
                    this.n_descendant += child.n_descendant;
                    // minimax
                    if(this.player === AI_CHAR){
                        if(child.score > likely_to_be_chosen){
                            likely_to_be_chosen = child.score;
                            likely_to_be_chosen_index = index;
                        }
                    }else{
                        if(child.score < likely_to_be_chosen){
                            likely_to_be_chosen = child.score;
                            likely_to_be_chosen_index = index;
                        }
                    }
                    //this.score += child.score * child.n_descendant / this.n_descendant;
                }
            }
        }
        // assign child's score
        this.score = likely_to_be_chosen;// + this.board.score(AI_CHAR);
        //if(this.score > 1){
        //    this.score = 1;
        //}else if(this.score < -1){
        //    this.score = -1;
        //}
        return this.score;
    }
    _think(number_of_new_born,all_search_depth = 0){
        if(this.searched){
            this.iswinGuaranteed();
            return 0;
        }else if(number_of_new_born <= 0){
            this.calculateScore();
            return 0;
        }
        let n_null_children = this.get_n_null_children();
        let n_new_born_child = 0;
        if(all_search_depth > 0){
            number_of_new_born -= n_null_children;
            const number_of_new_born_for_children = n_null_children !== 0 ? Math.floor(number_of_new_born / n_null_children) : Math.floor(number_of_new_born/this.list.length);
            while(n_null_children > 0){
                let a_child = this.get_a_child(true);
                if(a_child === null){
                    //already fully searched
                    return n_new_born_child;
                }
                n_new_born_child += 1;
                if(a_child.gameFinished === 0){
                    // game is not finished, think further
                    n_new_born_child += a_child._think(number_of_new_born_for_children,all_search_depth - 1);
                }
                n_null_children -= 1;
            }
        }else{
            while(n_new_born_child < number_of_new_born){
                //let chosen_child = Math.random() < 1/3 ? this.get_a_child() : this.minimaxSelect();
                let chosen_child = null;
                if(this.player === AI_CHAR){
                    chosen_child = Math.random() < 1/8 ? this.get_a_child(true) : this.minimaxSelect();
                }else{
                    chosen_child = Math.random() < 1/2 ? this.get_a_child(true)  : this.minimaxSelect();
                }
                
                if(chosen_child === null){
                    this.calculateScore();
                    if(this.searched){
                        return n_new_born_child;
                    }
                    chosen_child = this.get_a_child(true);
                    if(chosen_child === null){
                        console.log("Unexpected null child in _think()");
                        console.log(this);
                        return 420;
                    }      
                }
                if(chosen_child.searched || chosen_child.iswinGuaranteed() !== undefined){
                    if(chosen_child.newBorn){
                        // this child is probably the child at the end of the game
                        n_new_born_child += 1;
                        chosen_child.calculateScore();
                        break;
                    }
                }else if(chosen_child.iswinGuaranteed()){
                    // this path does not need further search
                    break;
                }
                if(chosen_child.newBorn){
                    n_new_born_child += 1;
                    let remain_new_born = number_of_new_born - n_new_born_child;
                    let new_born_for_child = Math.floor(remain_new_born / 2);
                    n_new_born_child += chosen_child._think( new_born_for_child);
                }else{
                    let remain_new_born = number_of_new_born - n_new_born_child;
                    n_new_born_child += chosen_child._think(remain_new_born);
                }
            }
        }
        if(this.depth > DEEPEST_DEPTH){
            console.log("Deepest depth reached: " + this.depth);
            DEEPEST_DEPTH = this.depth;
        }
        this.calculateScore();
        return n_new_born_child;
    }
    think(remTimeMs = 100,secretMode=false){
        if(this.iswinGuaranteed()){
            return;
        }
        const startTime = Date.now();
        // this will ensure that all children are evaluated at least once
        this._think(4,1);
        if(this.depth == 4){
            let child;
            for(let index = 0; index < this.list.length; index++){
                let [r,c,_child] = this.list[index];
                if(r !== 4 && c !== 5){
                    _child.score = Number.NEGATIVE_INFINITY;
                }else{
                    child = _child;
                }
            }
            while (Date.now() - startTime < remTimeMs) {
                child._think(16);
            }
        }
        while (Date.now() - startTime < remTimeMs ) {
            let child = this.get_a_child(true);
            if(child !== null){
                child._think(4);
            }else{
                console.log("No child to think in main think()");
                console.log(this);
                alert("Error: No child to think in main think()");
                break;
            }
            
            for(let i = 0;i < this.list.length;i++){
                let [r,c,_child] = this.list[i];
                if(_child !== null){
                    _child._think(1);
                }else{
                    _child = this.get_a_child(true);
                    _child._think(2);
                }
            }
            if(this.iswinGuaranteed()){
                break;
            }
        }
        this.calculateScore();
    }
    iswinGuaranteed(){
        if(this.winGuaranteed !== undefined){
            return this.winGuaranteed;
        }
        this.winGuaranteed = undefined;
        let allChildrenAreWinGuaranteed = this.player == AI_CHAR ? false : true;
        let all_null = true;
        this.searched = true;
        for(let [r,c,child] of this.list){
            if(child === null){
                this.searched = false;
                allChildrenAreWinGuaranteed = false;
                continue;
            }else if(!child.searched){
                this.searched = false;
                allChildrenAreWinGuaranteed = false;
            }
            all_null = false;
            let result = child.iswinGuaranteed();
            if(result !== undefined){
                if(this.player === AI_CHAR){
                    allChildrenAreWinGuaranteed = false;
                    if(result){
                        this.winGuaranteed = true;
                        this.searched = true;
                        this.score = 10;
                        return true;
                    }
                }else{
                    //opponent's turn
                    if(!result){
                        allChildrenAreWinGuaranteed = false;
                    }
                }
            }else{
                allChildrenAreWinGuaranteed = false;
            }
        }
        if(all_null){
            this.winGuaranteed = undefined;
            return this.winGuaranteed;
        }else if(allChildrenAreWinGuaranteed){
            this.winGuaranteed = true;
            this.searched = true;
        }
        return this.winGuaranteed;
    }

}

function getCellSize(){
    const isSmartphone = window.innerWidth <= 800;
    return isSmartphone ? Math.floor(window.innerWidth * 0.75 / 8) : Math.floor(window.innerHeight * 0.80 / 8);
}

function updateBoard(_instance = new Board()) {
    const isSmartphone = window.innerWidth <= 800;
    let board = document.getElementById("board");
    board.innerHTML = '';
    if(isSmartphone){
        let faceEle = document.getElementById("face")
        board.style.top = faceEle.offsetTop + faceEle.height + 20 + "px";
    }
    let red_weight = Array(8).fill(null).map(() => Array(8).fill(0));
    if(document.getElementById("bgm").paused){
        document.getElementById("bgm").play();
    }
    if(_instance.renderColor === "red"){
        // weighted positions for red rendering
        // higher the value of _instance.render[r][c], redder the text
        const minVal = _instance.render.flat().reduce((a, b) => Math.min(a, b === "" ? Infinity : parseFloat(b)), Infinity);
        const maxVal = _instance.render.flat().reduce((a, b) => Math.max(a, b === "" ? -Infinity : parseFloat(b)), -Infinity);
        const adjustedScores = _instance.render.map(row => row.map(val => val === "" ? 0 
                            : (isFinite(val) ? (val - minVal) / (maxVal - minVal + 0.0001) : 1 )));
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(_instance.render[r][c] !== ""){
                    if(_instance.render[r][c] === "∞" ){
                        red_weight[r][c] = 255;
                    }else if(_instance.render[r][c] === "-∞" ){
                        red_weight[r][c] = 0;
                    }else{
                        red_weight[r][c] = Math.floor(255 * adjustedScores[r][c]);
                    }
                    
                }
            }
        }
    }
    const WINDOW_WIDTH = window.innerWidth;
    const CELL_SIZE = getCellSize();
    const BOARD_WIDTH = CELL_SIZE * 8;
    const CELL_SIZE_STR = `${CELL_SIZE}px`;
    const KOMA_SIZE = Math.floor(CELL_SIZE * 3 / 4);
    const KOMA_SIZE_STR = `${KOMA_SIZE}px`;
    const FONT_SIZE = `${Math.floor(CELL_SIZE * 1/2)}px`;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement("div");
            cell.id = `cell-${r}-${c}`;
            cell.className = "cell";
            cell.style.width = CELL_SIZE_STR;
            cell.style.height = CELL_SIZE_STR;
            cell.style.border = "1px solid black";
            cell.style.boxSizing = "border-box";
            cell.style.display = "inline-block";
            cell.style.verticalAlign = "top";
            cell.style.backgroundColor = (r + c) % 2 === 0 ? "#aad751" : "#a2d149";
            if(_instance._get(r,c) === 'o') {
                const piece = document.createElement("div");
                piece.style.width = KOMA_SIZE_STR;
                piece.style.height = KOMA_SIZE_STR;
                piece.style.borderRadius = "50%";
                piece.style.backgroundColor = "white";
                piece.style.margin = `${(CELL_SIZE - KOMA_SIZE) / 2}px`;

                cell.appendChild(piece);
            } else if(_instance._get(r,c) === '*') {
                const piece = document.createElement("div");
                piece.style.width = KOMA_SIZE_STR;
                piece.style.height = KOMA_SIZE_STR;
                piece.style.borderRadius = "50%";
                piece.style.backgroundColor = "black";
                piece.style.margin = `${(CELL_SIZE - KOMA_SIZE) / 2}px`;
                cell.appendChild(piece);
            } else if(_instance.render && _instance.render[r][c] !== ""){
                const text = document.createElement("div");
                text.style.position = "absolute";
                text.style.width = CELL_SIZE_STR;
                text.style.height = CELL_SIZE_STR;
                text.style.lineHeight = CELL_SIZE_STR;
                text.style.textAlign = "center";
                text.style.fontSize =  FONT_SIZE;
                
                if(_instance.renderColor === "red"){
                    const red = red_weight[r][c];
                    text.style.color = `rgb(${red},0,0)`;
                }else{
                    text.style.color = _instance.renderColor || "blue";
                }
                text.style.userSelect = "none";
                text.innerText = _instance.render[r][c];
                cell.appendChild(text);
            }
            board.appendChild(cell);
        }
        if ( r !==7){
            const br = document.createElement("div");
            br.style.clear = "both";
            board.appendChild(br);
        }
    }
    if(!isSmartphone){
        const faceEle = document.getElementById("face");
        board.style.left = `${(WINDOW_WIDTH - BOARD_WIDTH - faceEle.width ) / 2}px`;
    }
    return _instance;
}

let    DEEPEST_DEPTH = -1;
function drawCircleAt(r,c, color="yellow",opacity=0.5){
    const board = document.getElementById("board");
    const cell  = document.getElementById(`cell-${r}-${c}`);
    if(!cell) return;
    const circle = document.createElement("div");
    const CELL_SIZE = getCellSize();
    const KOMA_SIZE = Math.floor(CELL_SIZE * 3 / 4);
    const CIRCLE_SIZE = Math.floor(KOMA_SIZE / 2);
    const CIRCLE_SIZE_STR = `${CIRCLE_SIZE}px`;
    circle.style.width = CIRCLE_SIZE_STR;
    circle.style.height = CIRCLE_SIZE_STR;
    circle.style.borderRadius = "50%";
    circle.style.backgroundColor = color;
    circle.style.opacity = opacity;
    circle.style.position = "absolute";
    circle.style.top = `${cell.offsetTop + (CELL_SIZE - CIRCLE_SIZE) / 2}px`;
    circle.style.left = `${cell.offsetLeft + (CELL_SIZE - CIRCLE_SIZE) / 2}px`;
    circle.style.pointerEvents = "none"; // To allow clicks to pass through
    board.appendChild(circle);
    return circle;
}

function renderInsideInfo(){
    const isSmartphone = window.innerWidth <= 800;
    let faceEle = document.getElementById("face");
    let ele = document.getElementById("info");
    ele.style.position = "absolute";
    ele.style.width = faceEle.width + "px";
    if (isSmartphone){
        ele.style.top = (faceEle.offsetTop + faceEle.height + 3) + "px";
    } else {
        ele.style.top = (faceEle.offsetTop + faceEle.height + 10) + "px";
    }
    ele.style.left = faceEle.offsetLeft + "px";
    progressBar.style.width = (faceEle.width - 0) + "px";
    if(AI_CHAR === '*'){
        progressBar.style.backgroundColor = "black";
    }else{
        progressBar.style.backgroundColor = "white";
    }
    
    if(HEAD.score || HEAD.depth === 4){
        let progressBar = document.getElementById("progressBar");
        let RATE = HEAD.depth === 4 ? 0.5 : HEAD.score * 0.5 + 0.5;
        RATE = Math.min(Math.max(RATE, 0), 1);
        let box = document.createElement("div");
        box.style.width = `${(1-RATE) * 100}%`;
        box.style.backgroundColor = PLAYER_CHAR === '*' ? "black" : "white";
        box.style.position = "absolute";
        box.style.left = "0px";
        box.style.height = isSmartphone ? "10px" : "20px";
        progressBar.innerHTML = '';
        progressBar.appendChild(box);
    }
   
    let leftText = document.getElementById("leftText");
    let rightText = document.getElementById("rightText");
    const PLAYER_TIME_MIN = Math.floor(PLAYER_TIME / (1000 * 60));
    const PLAYER_TIME_SEC = Math.floor((PLAYER_TIME % (1000 * 60)) / 1000);
    const AI_TIME_MIN = Math.floor(AI_TIME / (1000 * 60));
    const AI_TIME_SEC = Math.floor((AI_TIME % (1000 * 60)) / 1000);
    if(isSmartphone){
        leftText.innerHTML = "あなた " + `${currentBoard.countPieces(PLAYER_CHAR)}コマ` + "<br>"  + `${PLAYER_TIME_MIN}:${PLAYER_TIME_SEC.toString().padStart(2,'0')}` ;
        rightText.innerHTML = `${currentBoard.countPieces(AI_CHAR)}コマ` + " わたし<br>" + `${AI_TIME_MIN}:${AI_TIME_SEC.toString().padStart(2,'0')}`;
    }else{
        leftText.innerHTML = "あなた<br>" + `${PLAYER_TIME_MIN}:${PLAYER_TIME_SEC.toString().padStart(2,'0')}` + "<br>" + `${currentBoard.countPieces(PLAYER_CHAR)}コマ`;
        rightText.innerHTML = "わたし<br>" + `${AI_TIME_MIN}:${AI_TIME_SEC.toString().padStart(2,'0')}` + "<br>" + `${currentBoard.countPieces(AI_CHAR)}コマ`;
    }
    
    leftText.style.color = PLAYER_CHAR === '*' ? "black" : "white";
    rightText.style.color = AI_CHAR === '*' ? "black" : "white";
}

function insertFace(face = "normal"){
    const img = document.getElementById("face");
    const isSmartphone = window.innerWidth <= 800;
    if(isSmartphone){
        img.style.left = (window.innerWidth - img.width) / 2 + "px";
        img.src = `face/${face}-short.jpg`;
    }else{
        const board = document.getElementById("board");
        img.src = `face/${face}.jpg`;
        img.style.right = (window.innerWidth - img.width - board.width) / 2 + "px";
    }
    renderInsideInfo();
}

function playSound(id){
    const sound = document.getElementById(id);
    sound.currentTime = 0;
    sound.play();
}

function playVoice(voiceList){
    const index = Math.floor(Math.random() * voiceList.length);
    playSound(voiceList[index]);
}

let AI_CHAR = 'o';
let PLAYER_CHAR = '*';

let currentBoard = new Board();
let HEAD = new Node(currentBoard, PLAYER_CHAR);

let CALL_ENDGAME = false;

let AI_THINKING = false;

let PLAYER_TIME = 20 * 1000 * 60;
let AI_TIME     = 20 * 1000 * 60;
let AI_TIME_LIMIT = DIFFICULTY_CONST * 1000 / 2;
let DEEP_THINK = 1;
let SECRET_THINKING = DIFFICULTY_CONST * 100; // 20 * DIFFICULTY_CONST * 100 = DIFFICULTY_CONST s of secret thinking
let lastTimestamp = null;

function frameUpdate(){
    if(CALL_ENDGAME){
        CALL_ENDGAME = false;
        gameEnded();
        currentBoard = updateBoard(currentBoard);
        AI_THINKING = false;
        AI_GOT_ANSWER = false;
        return;
    }else if(AI_THINKING){
        HEAD.think(200); //think for 100 ms per frame
        r_c_score_list = [];
        for(const [r,c,child] of HEAD.list){
            if(child){
                if(child.iswinGuaranteed()){
                    r_c_score_list.push([r,c,Number.POSITIVE_INFINITY]);
                    AI_TIME_LIMIT = 0; // stop thinking
                }else{
                    r_c_score_list.push([r,c,10*child.score]);
                }
                
            }
        }
        
        const d = new Date();
        const currentTimestamp = d.getTime();
        AI_TIME_LIMIT -= currentTimestamp - lastTimestamp;
        AI_TIME -= currentTimestamp - lastTimestamp;
        lastTimestamp = currentTimestamp;

        if(AI_TIME_LIMIT > 0 && !HEAD.searched){
            currentBoard.setList(r_c_score_list, AI_CHAR, true);
            playSound("kyupi");
            currentBoard = updateBoard(currentBoard);
            //renderInsideInfo();
        }else{
            currentBoard.render = null;
            currentBoard.renderColor = null;
            AI_THINKING = false;
            r_c_score_list = [];
            let SCORE = Number.NaN;
            max_index = -1;
            AI_TIME_LIMIT = DIFFICULTY_CONST * 1000;
            if(HEAD.iswinGuaranteed()){
                SCORE = Number.POSITIVE_INFINITY;
                for(index = 0; index < HEAD.list.length; index++){
                    const [r,c,child] = HEAD.list[index];
                    if(child !== null && child.iswinGuaranteed()){
                        max_index = index;
                        SCORE = 10;
                        break;
                    }
                }
            }
            if(max_index < 0){
                SCORE = Number.NEGATIVE_INFINITY;
                for(index = 0; index < HEAD.list.length; index++){
                    const [r,c,child] = HEAD.list[index];
                    r_c_score_list.push([r,c,10*child.score]);
                    if(child.iswinGuaranteed()){
                        SCORE = 10.0;
                        max_index = index;
                        break;
                    }
                    if(child.score > SCORE){
                        SCORE = child.score;
                        max_index = index;
                    }
                }
            }
            if( ! HEAD.list[max_index][2].searched 
                && HEAD.list[max_index][2].n_descendant <= DIFFICULTY_CONST*100 // only deep think when the subtree is small
                && DEEP_THINK > 0       // only deep think once per turn
                && HEAD.depth > 18 // do not deep think in early game
            ){
                // continue thinking. This is allowed only once per turn.
                AI_THINKING = true;
                AI_TIME_LIMIT = DIFFICULTY_CONST * 1000;
                playVoice(VOICE_ID_THINKING);
                DEEP_THINK -= 1;
                return;
            }
            //console.log(JSON.parse(JSON.stringify(HEAD)));
            DEEP_THINK = 1; // reset deep think allowance for next turn
            const r = HEAD.list[max_index][0];
            const c = HEAD.list[max_index][1];
            currentBoard.put(r, c, AI_CHAR);
            playSound("pon");
            console.log(r,c,":",SCORE, RATE,HEAD.list[max_index][2].n_descendant);
            HEAD = HEAD.list[max_index][2];
            if(currentBoard.isGameOver()){
                CALL_ENDGAME = true;
                currentBoard = updateBoard(currentBoard);
                AI_THINKING = false;
                return;
            }

            if(currentBoard.isPuttable(PLAYER_CHAR)){
                AI_THINKING = false;
                const d = new Date();
                lastTimestamp = d.getTime();
                //HEAD.board.print2Console();
                currentBoard.setList(HEAD.getList(), PLAYER_CHAR, false);
                SECRET_THINKING = 100;
                SCORE *= HEAD.depth / 64;
                if(HEAD.depth > 6){
                    if(SCORE >= 0.9){
                        insertFace("laugh");
                        playVoice(VOICE_ID_PUT_LAUGHING);
                    } else if(SCORE < -0.5){
                        insertFace("cry");
                        playVoice(VOICE_ID_PUT_CRYING);
                    } else if(SCORE > 0.5){
                        insertFace("smile");
                        playVoice(VOICE_ID_PUT_WINNING);
                    } else if(SCORE < -0.1){
                        insertFace("confused");
                        playVoice(VOICE_ID_PUT_LOSING);
                    } else {
                        insertFace("normal");
                        playVoice(VOICE_ID_PUT_NORMAL);
                    }
                }
            }else{
                AI_THINKING = true;
                playSound("noMove");
            }
            
            currentBoard = updateBoard(currentBoard);
            renderInsideInfo();
            drawCircleAt(r, c, "red", 0.5);
        }
    }else if(lastTimestamp != null){
        //player is thinking
        const d = new Date();
        const currentTimestamp = d.getTime();
        PLAYER_TIME -= currentTimestamp - lastTimestamp;
        lastTimestamp = currentTimestamp;
        if(PLAYER_TIME <= 0){
            gameEnded(true);
            AI_THINKING = false;
            return;
        }
        // secretly let AI think in the background
        if(SECRET_THINKING > 0 && currentTimestamp % 2 === 0){
            HEAD.think(20, true);
            //HEAD.calculateScore();
            console.log("secretly thinking...");
            SECRET_THINKING -= 1;
        }
        renderInsideInfo();
    }
}

function gameEnded(timeUp = false){
    renderInsideInfo();
    
    if(timeUp){
        insertFace("confused");
        playSound("lose");
        alert("Time Up!!\nあなたの負けです...");
        lastTimestamp = null;
        return;
    }
    const pCount = currentBoard.countPieces(PLAYER_CHAR);
    const aiCount = currentBoard.countPieces(AI_CHAR);
    let result = '';
    if(pCount > aiCount){
        result = 'あなたの勝ち...おめでとう！';
        playSound("win");
        playVoice(VOICE_ID_LOST);
    } else if(pCount < aiCount){
        result = '私の勝ち！';
        playSound("lose");
        playVoice(VOICE_ID_WIN);
    } else {
        result = "なんと...引き分け！";
        playSound("win");
    }
    alert(`Game Over!!\nわたしのスコア: ${aiCount}\nあなたのスコア: ${pCount}\n${result}`);
    lastTimestamp = null;
}

function playerInput(event) {
    const board = document.getElementById("board");
    const rect = document.getElementById("cell-0-0").getBoundingClientRect();
    const CELL_SIZE = getCellSize();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const c = Math.floor(x / CELL_SIZE);
    const r = Math.floor(y / CELL_SIZE);
    if(AI_THINKING) {
        console.log("AI is thinking, please wait.");
        playSound("error");
        return;
    }
    console.log(`Clicked on row ${r}, column ${c}`);
    const newBoard = currentBoard.duplicate();
    if(newBoard.put(r, c, PLAYER_CHAR)){
        playSound("kako");
        currentBoard = newBoard;
        currentBoard = updateBoard(currentBoard);
        HEAD.think(10,true); // this is to avoid null 
        let tmp = HEAD.list.find(x => x[0] === r && x[1] === c)[2];
        if(tmp === null){
            console.log("This must not be happning...");
            HEAD.board.print2Console();
            console.log(JSON.parse(JSON.stringify(HEAD)));
        }
        HEAD = tmp;
        if(currentBoard.isGameOver()){
            CALL_ENDGAME = true;
            return;
        }
        if(currentBoard.isPuttable(AI_CHAR)){
            AI_THINKING = true;
            const d = new Date();
            const currentTimestamp = d.getTime();
            if(lastTimestamp != null){
                PLAYER_TIME -= (currentTimestamp - (lastTimestamp || currentTimestamp));
            }
            lastTimestamp = currentTimestamp;
        }else{
            console.log("Opponent has no moves, your turn again.");
            currentBoard.setList(HEAD.getList(), PLAYER_CHAR, false);
            currentBoard = updateBoard(currentBoard);
        }
    } else {
        console.log("Invalid move");
        playSound("error");
    }
}


function startGame(playerChar){
    PLAYER_CHAR = playerChar;
    AI_CHAR = playerChar === 'o' ? '*' : 'o';
    insertFace("normal");
    playVoice(VOICE_ID_START);
    currentBoard = new Board();
    HEAD = new Node(currentBoard, '*');
    AI_TIME    = 20 * 1000 * 60;
    PLAYER_TIME= 20 * 1000 * 60;
    const d = new Date();
    lastTimestamp = d.getTime();
    RATE = 0.5;
    if(AI_CHAR === '*'){
        AI_THINKING = true;
    }else{
        currentBoard.setList(HEAD.getList(), PLAYER_CHAR, false);
        HEAD.think(10,true);
    }
    currentBoard = updateBoard(currentBoard);
    renderInsideInfo();
}

window.onload = function() {
    startGame('*');
    lastTimestamp = null;

    const board = document.getElementById("board");
    board.addEventListener("click", playerInput);
    setInterval(frameUpdate, 100);
    document.getElementById("bgm").volume = 0.3;
    insertFace("normal");
    currentBoard = updateBoard(currentBoard);
    renderInsideInfo();
    document.getElementById("versionDiv").innerHTML = "Version 0.5<br> Voice by White CUL<br> Illustration by Grok<br> Sound effect by 効果音ラボ";
    
};

window.onresize = function() {
    currentBoard = updateBoard(currentBoard);
    renderInsideInfo();
}