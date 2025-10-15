const DIFFICULTY = 200;
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
        this.cells = Array(8).fill(null).map(() => Array(8).fill(' '));
        this.cells[3][3] = 'o';
        this.cells[4][4] = 'o';
        this.cells[3][4] = '*';
        this.cells[4][3] = '*';
    }
    duplicate(){const newBoard = new Board();
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                newBoard.cells[r][c] = this.cells[r][c];
            }
        }
        return newBoard;
    }
    put(r,c,player,flip=true){
        if(this.cells[r][c] !== ' ') return false;
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
            while(nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.cells[nr][nc] === opponent){
                toFlip.push([nr, nc]);
                nr += dr;
                nc += dc;
            }
            if(nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.cells[nr][nc] === player && toFlip.length > 0){
                total_flip += toFlip.length;
                if(flip){
                    for(const [fr, fc] of toFlip){
                        this.cells[fr][fc] = player;
                    }
                }
            }
        }
        if(flip){
            this.cells[r][c] = player;
        }
        return total_flip;
    }
    isPuttable(player){
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(this.cells[r][c] === ' '){
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
                if(this.cells[r][c] === player){
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
                this.render[r][c] = val.toFixed(1);
            }else{
                this.render[r][c] = this.put(r,c,player,false) + "";
            }
        }
    }
};

class Brain{
    static LIST = [];
    static normalizeList(list){
        if(list.length === 0) return list;
        const minScore = Math.min(...list.map(x => x[2]));
        const adjustedScores = list.map(x => x[2] - minScore + 1);
        const totalScore = adjustedScores.reduce((a, b) => a + b, 0);
        return list.map((x, i) => [x[0], x[1], adjustedScores[i] / totalScore]);
    }
    static getList(board, player){
        const list = [];
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(board.cells[r][c] === ' '){
                    if(board.put(r, c, player, false)){
                        list.push([r, c, 0]);
                    }
                }
            }
        }
        return list;
    }

    static rouletteSelect(list){
        const probs = list.map(x => x[2]);
        const rndVal = Math.random();
        let cumulative = 0;
        for(let i=0; i<probs.length; i++){
            cumulative += probs[i];
            if(rndVal < cumulative){
                return i;
            }
        }
        return -1; // Should not reach here
    }

    static randomSelect(list){
        const size = list.length;
        const index = Math.floor(Math.random() * size);
        return index;
    }
    static __think(board, player, r, c){
        board.put(r, c, player)
        if(board.isGameOver()){
            const myCount = board.countPieces(player);
            const oppCount = board.countPieces(player === 'o' ? '*' : 'o');
            if(myCount > oppCount) return 1;
            else if(myCount < oppCount) return -1;
            else return 0;
        }
        const opponent = player === 'o' ? '*' : 'o';
        let list = Brain.getList(board, opponent);
        if(list.length === 0){
            // Opponent has no moves
            let list2 = Brain.getList(board, player);
            let index = Brain.randomSelect(list2);
            r = list2[index][0];
            c = list2[index][1];
            return this.__think(board, player, r, c);
        }

        let index = Brain.randomSelect(list);
        r = list[index][0];
        c = list[index][1];
        return -this.__think(board, opponent, r, c);

    }
    static _think(board, player){
        let list = Brain.getList(board, player);
        for(let index=0; index<list.length; index++){
            let [r, c, score] = list[index];
            for(let _=0; _<DIFFICULTY; _++){
                score += this.__think(board.duplicate(), player, r, c);
            }
            list[index] = [r, c, score];
        }
        list.sort((a, b) => b[2] - a[2]);
        return Brain.normalizeList(list);
    }
    static think(board, player){
        let list = Brain.getList(board, player);
        AI_LIST = [];
        const player_opponent = player === 'o' ? '*' : 'o';
        if(list.length >= 10){
            playVoice(VOICE_ID_THINKING);
        }
        AI_LIST_SIZE = list.length;
        for(let index=0; index<list.length; index++){
            setTimeout(() => {
                let [r, c, score] = list[index];
                let tmp = board.duplicate();
                tmp.put(r, c, player);
                if(tmp.isGameOver()){
                    const myCount = tmp.countPieces(player);
                    const oppCount = tmp.countPieces(player_opponent);
                    if(myCount > oppCount) {score += DIFFICULTY;}
                    else if(myCount < oppCount) {score -= DIFFICULTY;}
                    AI_LIST.push([r, c,[],null, score,2*DIFFICULTY]);
                    ITERATE_AI = true;
                    return;
                }
                const opp_list = Brain._think(tmp, player_opponent);
                if (opp_list.length === 0) {
                    AI_LIST.push([r, c,[],null ,score + DIFFICULTY,2*DIFFICULTY]); // Opponent has no moves, good for us
                    ITERATE_AI = true;
                    return;
                }else{
                    const opp_r = opp_list[0][0];
                    const opp_c = opp_list[0][1];
                    drawCircleAt(opp_r, opp_c, "#51A2FF", 0.5);playSound("kyupi");
                }
                AI_LIST.push([r, c, opp_list,tmp.duplicate() ,score,0]);
                ITERATE_AI = true;        
            }, index*100);
            
        }
    }
}


function updateBoard(_instance = new Board()) {
    const board = document.getElementById("board");
    board.innerHTML = '';
    let red_weight = Array(8).fill(null).map(() => Array(8).fill(0));
    if(document.getElementById("bgm").paused){
        document.getElementById("bgm").play();
    }
    if(_instance.renderColor === "red"){
        // weighted positions for red rendering
        // higher the value of _instance.render[r][c], redder the text
        const minVal = _instance.render.flat().reduce((a, b) => Math.min(a, b === "" ? Infinity : parseFloat(b)), Infinity);
        const maxVal = _instance.render.flat().reduce((a, b) => Math.max(a, b === "" ? -Infinity : parseFloat(b)), -Infinity);
        const adjustedScores = _instance.render.map(row => row.map(val => val === "" ? 0 : (val - minVal) / (maxVal - minVal + 0.0001)));
        for(let r=0; r<8; r++){
            for(let c=0; c<8; c++){
                if(_instance.render[r][c] !== ""){
                    red_weight[r][c] = Math.floor(255 * adjustedScores[r][c]);
                }
            }
        }
    }
    const WINDOW_WIDTH = window.innerWidth;
    const CELL_SIZE = Math.floor(WINDOW_WIDTH * 0.50 / 8);
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
            if(_instance.cells[r][c] === 'o') {
                const piece = document.createElement("div");
                piece.style.width = KOMA_SIZE_STR;
                piece.style.height = KOMA_SIZE_STR;
                piece.style.borderRadius = "50%";
                piece.style.backgroundColor = "white";
                piece.style.margin = "8px auto";
                cell.appendChild(piece);
            } else if(_instance.cells[r][c] === '*') {
                const piece = document.createElement("div");
                piece.style.width = KOMA_SIZE_STR;
                piece.style.height = KOMA_SIZE_STR;
                piece.style.borderRadius = "50%";
                piece.style.backgroundColor = "black";
                piece.style.margin = "8px auto";
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
    return _instance;
}

function drawCircleAt(r,c, color="yellow",opacity=0.5){
    const board = document.getElementById("board");
    const cell  = document.getElementById(`cell-${r}-${c}`);
    if(!cell) return;
    const circle = document.createElement("div");
    const CELL_SIZE = Math.floor(window.innerWidth * 0.50 / 8);
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
    const faceEle = document.getElementById("face");
    var ele = document.getElementById("info");
    var progressBar = document.getElementById("progressBar");
    ele.style.position = "absolute";
    ele.style.width = faceEle.width + "px";
    ele.style.top = (faceEle.offsetTop + faceEle.height + 10) + "px";
    ele.style.right = faceEle.style.right;
    progressBar.style.width = (faceEle.width - 20) + "px";
    progressBar.value = RATE;
    progressBar.max = 1.0;
    var leftText = document.getElementById("leftText");
    var rightText = document.getElementById("rightText");
    leftText.innerText = PLAYER_CHAR === '*' ? "あなた" : "わたし";
    leftText.style.color = PLAYER_CHAR === '*' ? "gray" : "black";
    rightText.innerText = PLAYER_CHAR === '*' ? "わたし" : "あなた";
    rightText.style.color = PLAYER_CHAR === '*' ? "black" : "gray";
}

function insertFace(face = "normal"){
    const img = document.getElementById("face");
    img.src = `face/${face}.jpg`;
    renderInsideInfo();
}

function playSound(id){
    const sound = document.getElementById(id);
    sound.currentTime = 0;
    sound.play();
}

function playVoice(voiceList){
    const index = Brain.randomSelect(voiceList);
    playSound(voiceList[index]);
}

let currentBoard = new Board();
let AI_THINKING = false;
let AI_LIST = [];
let AI_LIST_SIZE = -1;
let ITERATE_AI = false;

let AI_CHAR = '*';
let PLAYER_CHAR = 'o';

let RATE = 0.5;

let CALL_ENDGAME = false;

function frameUpdate(){
    if(CALL_ENDGAME){
        CALL_ENDGAME = false;
        gameEnded();
        currentBoard = updateBoard(currentBoard);
        AI_THINKING = false;
        return;
    }else if(AI_THINKING){
        allFinished = true;
        if(ITERATE_AI && AI_LIST.length == AI_LIST_SIZE){
            ITERATE_AI = false;
            for(let i = 0;i < AI_LIST.length; i++){
                let item = AI_LIST[i];
                if(item[5] < 4*DIFFICULTY){
                    allFinished = false;
                    setTimeout(() => {
                        const r = item[0];
                        const c = item[1];
                        const opp_list = item[2];
                        const board = item[3];
                        const score = item[4];
                        const TRIAL_N=DIFFICULTY/2;
                        for(let n = 0;n < TRIAL_N; n++){
                            if(opp_list.length === 0) break;
                            const tuple = opp_list[Brain.rouletteSelect(opp_list)];
                            const r2 = tuple[0];
                            const c2 = tuple[1];
                            const prob = tuple[2];
                            item[4] -= Brain.__think(board.duplicate(), AI_CHAR === 'o' ? '*' : 'o', r2, c2);
                        }
                        item[5] += TRIAL_N;
                        AI_LIST[i] = item;
                        ITERATE_AI = true;
                    }, 10);
                }
            }
            r_c_score_list = AI_LIST.map(x => [x[0], x[1], 10*x[4]/(x[5] || 1)]);
            playSound("kyupi");
            currentBoard.setList(r_c_score_list, AI_CHAR, true);
            if(allFinished && AI_LIST.length > 0){
                currentBoard.render = null;
                currentBoard.renderColor = null;
                console.log(AI_LIST);
                r_c_score_list = AI_LIST.map(x => [x[0], x[1], x[4]/(x[5] || 1)]);
                r_c_score_list.sort((a, b) => b[2] - a[2]);
                RATE = r_c_score_list.filter(x => x[2] > 0).length / r_c_score_list.length;
                if(AI_CHAR === 'o'){
                    RATE = 1.0 - RATE;
                }
                const [r, c, score] = r_c_score_list[0];
                console.log(score);
                currentBoard.put(r, c, AI_CHAR);
                playSound("pon");
                
                if(currentBoard.isGameOver()){
                    CALL_ENDGAME = true;
                    currentBoard = updateBoard(currentBoard);
                    AI_THINKING = false;
                    return;
                }
                if(currentBoard.isPuttable(PLAYER_CHAR)){
                    AI_THINKING = false;
                    currentBoard.setList(Brain.getList(currentBoard, PLAYER_CHAR), PLAYER_CHAR, false);
                }else{
                    AI_THINKING = true;
                    playSound("noMove");
                    Brain.think(currentBoard, AI_CHAR);
                    currentBoard.setList(Brain.getList(currentBoard, AI_CHAR), AI_CHAR, true);
                    return;
                }
                if(score >= 0.5){
                    insertFace("laugh");
                    playVoice(VOICE_ID_PUT_LAUGHING);
                } else if(score < -0.5){
                    insertFace("cry");
                    playVoice(VOICE_ID_PUT_CRYING);
                } else if(score > 0.2){
                    insertFace("smile");
                    playVoice(VOICE_ID_PUT_WINNING);
                } else if(score < -0.0){
                    insertFace("confused");
                    playVoice(VOICE_ID_PUT_LOSING);
                } else {
                    insertFace("normal");
                    playVoice(VOICE_ID_PUT_NORMAL);
                }
                currentBoard = updateBoard(currentBoard);
                drawCircleAt(r, c, "red", 0.5);
            }else{
                currentBoard = updateBoard(currentBoard);
            }
            
        }
    }
}

function gameEnded(){
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
    alert(`Game Over!!\nわたしのスコア: ${aiCount}\nOあなたのスコア: ${pCount}\n${result}`);
}

function playerInput(event) {
    const board = document.getElementById("board");
    const rect = board.getBoundingClientRect();
    const CELL_SIZE = Math.floor(window.innerWidth * 0.50 / 8);
    console.log(CELL_SIZE);
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
        if(currentBoard.isGameOver()){
            CALL_ENDGAME = true;
            return;
        }
        if(currentBoard.isPuttable(AI_CHAR)){
            AI_THINKING = true;
            insertFace("thinking");
            Brain.think(currentBoard, AI_CHAR);
            
        }else{
            console.log("Opponent has no moves, your turn again.");
            currentBoard.setList(Brain.getList(currentBoard, PLAYER_CHAR), PLAYER_CHAR, false);
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
    if(AI_CHAR === 'o'){
        AI_THINKING = true;
        Brain.think(currentBoard, AI_CHAR);
    }else{
        currentBoard.setList(Brain.getList(currentBoard, PLAYER_CHAR), PLAYER_CHAR, false);
    }
    currentBoard = updateBoard(currentBoard);
}

window.onload = function() {
    currentBoard.setList(Brain.getList(currentBoard, 'o'), 'o', false);
    console.log(currentBoard);
    currentBoard = updateBoard(currentBoard);
    const board = document.getElementById("board");
    board.addEventListener("click", playerInput);
    setInterval(frameUpdate, 100);
    document.getElementById("bgm").volume = 0.3;
    renderInsideInfo();
};

window.onresize = function() {
    currentBoard = updateBoard(currentBoard);
}
