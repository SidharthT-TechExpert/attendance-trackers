// app.js
const loadText = document.querySelector(".loading-text");
const background = document.querySelector(".background"); 
const spinner = document.querySelector(".spinner-container");

let load = 0;
let int = setInterval(blurring, 30);

function blurring() {
  load++;

  if (load > 99) {
    clearInterval(int); 
    spinner.style.display = "none";
    document.getElementById("loader").style.display = "none"; 
    document.getElementById("mainContent").style.display = "block";
  }

  loadText.innerText = `${load}%`;
  loadText.style.opacity = scale(load, 0, 100, 1, 0);
  background.style.filter = `blur(${scale(load, 0, 100, 30, 0)}px)`;
}

const scale = (num, in_min, in_max, out_min, out_max) => {
  return ((num - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
};
