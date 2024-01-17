// It occurred to me that people may look at this script to see how the game works, so I added comments.
// As a note, I did this as a programming exercise, as I hadn't used HTML / CSS / JS to create games before or made a Pong-like clone.
// Best practices were not strictly followed.

var canvas = document.getElementById('game');
var context = canvas.getContext('2d');
var startTime = window.performance.now(); // Used to track the time between frames

// These are all meant to be arrays.
var paddles = null;
var players = null;
var balls = null;

// Tuning Parameters
var scoreboardPadding = 20; // Space between the net and the text that shows the score

var paddleWidth = 5;
var paddleHeight = 25;
var paddleColor = '#FFFFFF'; // #FFFFFF is white in hexadecimal (FF = 255)

var ballWidth = 5;
var ballHeight = 5; // Could be collapsed into one variable, but maybe we want oval balls. Never know.
var ballColors = ['#FF00FF', '#1C60FF', '#00FF40', '#6FFF00', '#FFFF00', '#FF8C00', '#FF0000']; // Magenta, blue, green, yellow-green, yellow, orange, and red, respectively.

var pcSpeed = 5; // How fast the human-controlled paddle moves
var aiSpeed = 3.5; // How fast the computer-controlled paddle moves
var ballSpeed = 1.8;

var ballDampener = 0.85; // Speed reduction (so the AI can keep up with multiple balls)

var maxNumberOfBalls = ballColors.length; // Must be equal or less than the value of ballColors.length (otherwise there will be an error).

var fpsLimit = 60; // How fast the game redraws its graphics

// Classes
// JS doesn't have "classes" like other programming languages, but I'm using that framework because it's the most familiar to me.
function Player(paddle, score)
{
    this.paddle = paddle;
    this.score = score;
}

function Paddle(x, y, w, h, color, speed)
{
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.color = color;
    this.speed = speed;

    this.startingPositionX = x;
    this.startingPositionY = y;
    this.dx = 0; // dx = horizontal vector
    this.dy = 0; // dy = vertical vector
    this.targetRange = this.height; // how close the paddle should be relative to the ball --> this controls the AI's precision
}

function Ball(x, y, w, h, color, speed)
{
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.color = color;
    this.speed = speed;

    this.startingPositionX = x;
    this.startingPositionY = y;
    this.dx = 0;
    this.dy = 0;
}

function Score(value, x)
{
    this.value = value;
    this.x  = x; // Where it is located on the x-axis
    this.padding = scoreboardPadding; // Amount of space between the rendered score and the net.
}

// Randomization Functions
function randomizeDirection(ball)
{
    ball.dx = Math.floor(Math.random() * 3) - 1; // This generates a value between -1 and 1
    ball.dy = Math.floor(Math.random() * 3) - 1;

    if (ball.dx == 0) // If dx is 0, the ball will not move, so I'm forcing it to move towards the player (because the player likely has a better reaction time than the AI, and we want to keep the illusion of difficulty).
    {
        ball.dx = -1; // -1 = player-side (left). 1 = AI's side (right).
    }
}

// Graphics
// These functions are used to draw objects on the screen
function clearScreen()
{
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function redrawScreen(players, paddles, balls)
{
    clearScreen();
    drawNet();
    players.forEach(drawScore);
    paddles.forEach(drawPaddle);
    balls.forEach(drawBall);
}

// https://stackoverflow.com/questions/28057881/javascript-either-strokerect-or-fillrect-blurry-depending-on-translation
// According to this Stack Overflow Q&A, "[s]trokes draw half-inside & half-outside the x,y coordinates," resulting in a blurred outline.
// The following snippet of code fixes that.
context.drawRectOutline = function(x, y, w, h)
{
    x = parseInt(x) + 0.50;
    y = parseInt(y) + 0.50;
    this.strokeRect(x, y, w, h);
}

context.drawRect = function(x, y, w, h)
{
    x = parseInt(x);
    y = parseInt(y);
    this.fillRect(x, y, w, h);
}
// End of code snippet.

function drawNet()
{
    context.strokeStyle = '#1E1E2C';
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();   
}

function drawScore(player)
{
    context.fillStyle = '#424242';
    context.font = "20px monospace";
    context.textBaseline = 'center';
    context.textAlign = 'center';
    context.fillText(player.score.value, player.score.x, player.score.padding);
}

function drawPaddle(paddle)
{
    context.fillStyle = paddle.color;
    context.drawRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall(ball)
{
    context.fillStyle = ball.color;
    context.drawRect(ball.x, ball.y, ball.width, ball.height);
}

function getNextBallColor() // This changes the next ball's color
{
    return ballColors.pop();
}

// Physics Functions (determines the behavior of moving objects)
function updateMovement(object) // To cut down on code, I'm using a few "generic" functions (generic in name only).
{
    object.x += object.speed * object.dx; // For those wondering if this would affect the paddles, it shouldn't because I never ended up changing the value of the paddle's dx.
    object.y += object.speed * object.dy;
}

function checkBallWallCollision(ball) // I could've broken this down into two functions, but I thought this would be clear enough.
{
    if (ball.y > canvas.height - ball.height / 2)
    {
        ball.y = canvas.height - ball.height / 2;
        ball.dy *= -1;
    }
    else if (ball.y < ball.height / 2)
    {
        ball.y = ball.height / 2;
        ball.dy *= -1;
    }
}

function checkPaddleWallCollision(paddle)
{
    if (paddle.y > canvas.height - paddle.height)
    {
        paddle.y = canvas.height - paddle.height;
    }
    else if (paddle.y < 0)
    {
        paddle.y = 0;
    }
}

function checkBallOutOfBounds(ball) // This checks if a ball flew off-screen (and if someone scored a goal).
{
    return (ball.x > canvas.width || ball.x < 0); 
}

// Collision code taken from https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
function checkPaddleCollision(paddle, balls)
{
    for (var i = 0; i < balls.length; i++) // This could be a for each loop, but I decided to keep the indexes.
    {
        if (paddle.x < balls[i].x + balls[i].width && paddle.x + paddle.width > balls[i].x && paddle.y < balls[i].y + balls[i].height && paddle.y + paddle.height > balls[i].y) // Essentially, we're defining a rectangle around an object. If another object touches the rectangle, then we call that interaction a collision.
        {
            if (balls[i].x < canvas.width / 2)
            {
                balls[i].dx = Math.cos(((paddle.y + (paddle.height / 2) - balls[i].y) / (paddle.height / 2)) * (Math.PI / 5)); // Trig. Math.PI / 5 = 72 degrees.
                balls[i].dy = -Math.sin(((paddle.y + (paddle.height / 2) - balls[i].y) / (paddle.height / 2)) * (Math.PI / 5));
            }
            else
            {
                balls[i].dx = Math.cos(((paddle.y + (paddle.height / 2) - balls[i].y) / (paddle.height / 2)) * (Math.PI / 5)) * -1;
                balls[i].dy = Math.sin(((paddle.y + (paddle.height / 2) - balls[i].y) / (paddle.height / 2)) * (Math.PI / 5)) * -1;
            }
            
        }
    }
}

// State-Related Functions
function restart()
{
    resetBallParameters();
    paddles = [new Paddle(0 + paddleWidth, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, paddleColor, pcSpeed), new Paddle(canvas.width - paddleWidth * 2, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, paddleColor, aiSpeed)];
    players = [new Player(paddles[0], new Score(0, canvas.width / 2 - scoreboardPadding, scoreboardPadding)), new Player(paddles[1], new Score(0, canvas.width / 2 + scoreboardPadding, scoreboardPadding))];
    balls = [new Ball(canvas.width / 2 - ballWidth / 2, canvas.height / 2 - ballHeight / 2, ballWidth, ballHeight, getNextBallColor(), ballSpeed)];
    reset();
}

function reset()
{
    paddles.forEach(resetObject);
    balls.forEach(resetObject);
    balls.forEach(randomizeDirection);
}

function resetBallParameters()
{
    ballColors = ['#FF00FF', '#2EAFFF', '#00FFB7', '#6FFF00', '#FFFF00', '#FF8C00', '#FF0000']; // Since I used pop, I have to manually reset the values
    ballDampener = 0.85; // Speed reduction (so the AI can keep up with multiple balls)
}

function resetObject(object) 
{
    object.x = object.startingPositionX;
    object.y = object.startingPositionY;
}

function updatePaddles()
{
    checkPlayerInput(paddles[0]);
    updateAIPosition(paddles[1], balls);

    for (var i = 0; i < paddles.length; i++)
    {
        checkPaddleWallCollision(paddles[i]);
        checkPaddleCollision(paddles[i], balls);
        updateMovement(paddles[i]);
    }
}

function updateBalls()
{
    for (var i = 0; i < balls.length; i++)
    {
        checkBallWallCollision(balls[i]);
        updateMovement(balls[i]);
        if (checkBallOutOfBounds(balls[i]) && balls[i].x > canvas.width) // While this goal check could be separated into its own function, it's more efficient to do it now, while we're performing operations on the balls.
        {
            updateScore(players[0]);
            adjustDifficulty(players)
            reset(paddles, balls);
        }
        else if (checkBallOutOfBounds(balls[i]) && balls[i].x < 0)
        {
            updateScore(players[1]);
            adjustDifficulty(players);
            reset(paddles, balls);
        }
    }
}

function updateScore(player) // Updates the score
{
    player.score.value += 1;
}

function updateScreen() // Refreshes the screen.
{
    if (performance.now() - startTime > 1000 / fpsLimit) // Limits the frame rate to our chosen FPS.
    {
        startTime = performance.now();
        redrawScreen(players, paddles, balls); 
    }
}


// Player-Related Functions
function checkPlayerInput(paddle) // This looks for input from a keyboard.
{
    document.addEventListener('keyup', (e) => {
        if (e.key == "w" || e.key == "ArrowUp" || e.key == "s" || e.key == "ArrowDown") // Not sure how this interfaces with non-QWERTY keyboard layouts.
        {
            paddle.dy = 0;
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key == "w" || e.key == "ArrowUp")
        {
            paddle.dy = -1;
        }
        else if (e.key == "s" || e.key == "ArrowDown")
        {
            paddle.dy = 1;
        }
        else if (e.key == "r")
        {
            restart();
        }
    });
}

// AI Functions
function updateAIPosition(paddle, balls) // This controls the AI's behavior. The AI works by tracking the ball's y-position and moving the paddle towards that position.
{
    var target = findClosestBall(paddle, balls);
    
    if (balls.length == 1 && target.dx < 0) // When testing, I noticed that the AI tends to perform better in the multi-ball scenarios when it's able to track their positions earlier, which is why the number of balls is a condition here. 
    {
        paddle.dy = 0;
        return; // Stops the rest of the function's code from executing.
    }

    if (paddle.y - paddle.targetRange > target.y)
    {
        paddle.dy = -1;
    }
    else if (paddle.y + paddle.targetRange < target.y)
    {
        paddle.dy = 1;
    }
    else
    {
        paddle.dy = 0;
    } 
}

function findClosestBall(paddle, balls) // This function finds the ball closest to the AI's paddle.
{
    var result = balls[0]; // Result in this context is our chosen ball.
    var minDist = paddle.x - balls[0].x; // We need to set a default value in case there is only one ball or this happens to be the closest ball.
    for (var i = 0; i < balls.length; i++)
    {
        if (balls[i].dx <= 0)
        {
            continue;
        }
        if (paddle.x - balls[i].x < minDist) // If we find a ball closer to the paddle, we record that ball.
        {
            minDist = paddle.x - balls[i].x;
            result = balls[i];
        }
    }
    return result;
}

// Adjustment Functions
function adjustDifficulty(players) // This changes the game's difficulty in various ways (usually by adding more moving elements or adjusting the AI's reaction time)
{
    if ((players[0].score.value + players[1].score.value) % 2 == 0) // Every two levels, add 1 more ball (unless we've hit the max number of balls)
    {
        addBall();
    }

    if (players[0].score.value >= players[1].score.value) // To create the illusion of challenge, we're modifying the AI's behavior based on the player's performance. This statement checks if the player is winning against the AI or in a draw with the AI.
    {
        players[1].paddle.targetRange -= 1 * Math.abs((players[0].score.value - players[1].score.value)); // Math.abs = absolute value.
    }
    else // Player is losing against AI.
    {
        players[1].paddle.targetRange += 1 *  Math.abs((players[0].score.value - players[1].score.value));
    }

    if (players[1].paddle.targetRange < 2) // Cap values to prevent extreme behavior.
    {
        players[1].paddle.targetRange = 2;
    }
    if (players[1].paddle.targetRange > (players[1].paddle.height / 2) - (0.75 * balls.length))
    {
        players[1].paddle.targetRange = (players[1].paddle.height / 2) - (0.75 * balls.length);
    }
}

function adjustBallSpeed(ball)
{
    if (ball.speed > 1.5) // Need to introduce a speed limit.
    {
        ball.speed *= ballDampener;
        ball.speed += 0.05 * (Math.floor(Math.random() * 3) - 1); // Introduce slight speed variation so we can see most of the balls.
    }
}

function addBall()
{
    if (balls.length < maxNumberOfBalls)
    {
        balls.push(new Ball(canvas.width / 2 - ballWidth / 2, canvas.height / 2 - ballHeight / 2, ballWidth, ballHeight, getNextBallColor(), ballSpeed));
        balls.forEach(adjustBallSpeed);
    }
}

// Game Loop
function loop()
{
    updatePaddles();
    updateBalls();
    updateScreen();
    requestAnimationFrame(loop);
}

restart();
requestAnimationFrame(loop);