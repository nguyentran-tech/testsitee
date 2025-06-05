var counterBtn = document.querySelector('button')
var counterLabel = document.querySelector('span')
var number = 0;


counterBtn.addEventListener("click", function() {
    number++
    renderCounter()
})

function renderCounter() {
    counterLabel.innerText = number;
}

renderCounter()