// Helper function to get element by ID
const $ = (id) => document.getElementById(id);

// Loader Animation
const loader = $("loader");
const main = $("mainContent");
const percentEl = document.querySelector(".percent");
let p = 0;

const interval = setInterval(() => {
  p += Math.random() * 8;
  if (p >= 100) {
    p = 100;
    clearInterval(interval);
    loader.classList.add("fade-out");
    setTimeout(() => {
      loader.style.display = "none";
      main.style.display = "block";
    }, 900);
  }
  percentEl.textContent = Math.floor(p) + "%";
}, 120);



