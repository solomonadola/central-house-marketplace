const hambtn = document.querySelector(".btn");
const hambtn1 = document.querySelector(".btnx");
const navbar = document.getElementById("nav-bar");
hambtn.addEventListener('click', function() {
    if (hambtn.className !== "") {
        hambtn.style.display = "none";
        hambtn1.style.display = "block";
        navbar.style.display = "flex";
        navbar.style.flexDirection = "column";

    }

});
hambtn1.addEventListener('click', function() {
    if (hambtn1.className !== "") {
        hambtn1.style.display = "none";
        hambtn.style.display = "block";
        navbar.style.display = "none";

    }

});