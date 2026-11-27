let selectedLevel = 1;
let selectedColor = "w";

const difficultyButtons = document.querySelectorAll(".difficulty");
const colorButtons = document.querySelectorAll(".color-choice");

difficultyButtons.forEach(button => {
    button.addEventListener("click", () => {

        difficultyButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        selectedLevel = Number(button.dataset.level);
    });
});

colorButtons.forEach(button => {
    button.addEventListener("click", () => {

        colorButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        selectedColor = button.dataset.color;
    });
});

document.getElementById("startBot").addEventListener("click", () => {
localStorage.setItem("chessNovaBotLevel", selectedLevel);
localStorage.setItem("chessNovaPlayerColor", selectedColor);

window.location.href = "bot-game.html";

});