var canvas = document.getElementById('game');
var context = canvas.getContext('2d');

var paddleWidth = 5;
var paddleHeight = 20;
var paddleColor = 'white';

var ballWidth = 5;
var ballHeight = 5;
var ballColor = 'yellow';

var scoreboardPadding = 20;

function Player()
{
    this.score = 0;
}

function Paddle(x, y, w, h, color)
{
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.color = color;

    this.speed = 1; // how fast the paddle moves
    this.dx = 0; // this should always be zero
    this.dy = 0;
}

function Ball(x, y, w, h, color)
{
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.color = color;

    this.speed = 10; // how fast the ball moves
    this.dx = 0;
    this.dy = 0;
}

// https://stackoverflow.com/questions/28057881/javascript-either-strokerect-or-fillrect-blurry-depending-on-translation
// According to Stack Overflow, "[s]trokes draw half-inside & half-outside the x,y coordinates," resulting in a blurred outline.
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

function resetPaddles(leftPaddle, rightPaddle)
{
    leftPaddle.x = paddleWidth;
    leftPaddle.y = canvas.height / 2 - paddleHeight / 2;
    rightPaddle.x = canvas.width - paddleWidth * 2;
    rightPaddle.y = canvas.height / 2 - paddleHeight / 2;
}

function resetBall(ball)
{
    ball.x = canvas.width / 2 - ballWidth / 2;
    ball.y = canvas.height /2 - ballHeight / 2;
}

function reset()
{
    resetPaddles(leftPaddle, rightPaddle);
    resetBall(ball);
    randomizeDirection(ball); 
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

function drawNet()
{
    context.strokeStyle = '#1E1E2C';
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();
}

function drawScore(player1, player2)
{
    context.fillStyle = '#424242';
    context.font = "20px monospace";
    context.textBaseline = 'center';
    context.textAlign = 'center';
    context.fillText(player1.score, canvas.width / 2 - scoreboardPadding, scoreboardPadding);
    context.fillText(player2.score, canvas.width / 2 + scoreboardPadding, scoreboardPadding);
}

function randomizeDirection(ball)
{
    ball.dx = Math.floor(Math.random() * 3) - 1;
    ball.dy = Math.floor(Math.random() * 3) - 1;

    // Force ball to move in direction if dx is 0.
    if (ball.dx == 0)
    {
        ball.dx = 1;
    }
}

function updateBallMovement(ball)
{
    ball.x += ball.dx;
    ball.y += ball.dy;
}

function updatePaddleMovement(paddle)
{
    paddle.y += paddle.dy;
}

function checkBallWallCollision(ball)
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

function updateScore(player)
{
    player.score += 1;
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

function checkWin(ball)
{
    return (ball.x > canvas.width || ball.x < 0)
}

// Code taken from https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
function checkPaddleBallCollision(paddle, ball)
{
    if (paddle.x < ball.x + ball.width && paddle.x + paddle.width> ball.x && paddle.y < ball.y + ball.height && paddle.y + paddle.height > ball.y)
    {
        ball.dx *= -1;
        if (ball.dx > 0)
        {
            ball.x = paddle.x + paddle.width;
        }
        else
        {
            ball.x = paddle.x - ball.width;
        }
    }
}

function checkPlayerInput(paddle)
{
    document.addEventListener('keyup', (e) => {
        if (e.key == "w" || e.key == "ArrowUp" || e.key == "s" || e.key == "ArrowDown")
        {
            paddle.dy = 0;
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key == "w" || e.key == "ArrowUp")
        {
            paddle.dy = -paddle.speed;
        }
        else if (e.key == "s" || e.key == "ArrowDown")
        {
            paddle.dy = paddle.speed;
        }
    });
}

function updateAIPosition(paddle, ball)
{
    if (paddle.y > ball.y)
    {
        paddle.dy = -paddle.speed;
    }
    else if (paddle.y < ball.y)
    {
        paddle.dy = paddle.speed;
    }
}

// Start of the game loop
function loop()
{
    requestAnimationFrame(loop);
    checkBallWallCollision(ball);
    updateBallMovement(ball);

    checkPlayerInput(leftPaddle);
    checkPaddleWallCollision(leftPaddle);
    updatePaddleMovement(leftPaddle);

    updateAIPosition(rightPaddle, ball);
    checkPaddleWallCollision(rightPaddle);
    updatePaddleMovement(rightPaddle);

    checkPaddleBallCollision(leftPaddle, ball);
    checkPaddleBallCollision(rightPaddle, ball);

    if (checkWin(ball) && ball.x > canvas.width)
    {
        player1.score += 1;
        reset();
    }
    else if (checkWin(ball) && ball.x < 0)
    {
        player2.score += 1;
        reset();
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawScore(player1, player2);
    drawNet();
    drawPaddle(leftPaddle);
    drawPaddle(rightPaddle);
    drawBall(ball);
}

var player1 = new Player();
var player2 = new Player();
var leftPaddle = new Paddle(0 + paddleWidth, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, paddleColor)
var rightPaddle = new Paddle(canvas.width - paddleWidth * 2, canvas.height / 2 - paddleHeight / 2, paddleWidth, paddleHeight, paddleColor);
var ball = new Ball(canvas.width / 2 - ballWidth / 2, canvas.height / 2 - ballHeight / 2, ballWidth, ballHeight, ballColor);

reset();
requestAnimationFrame(loop);