
// Profile Section
const contactSection = document.querySelector(".contact"),
    toProfileButton = document.querySelector(".profile .contact .to-profile"),
    toContactButton = document.querySelector(".profile .to-contact");

toProfileButton.addEventListener("click", (e) => {
    e.preventDefault();
    contactSection.style.zIndex = "-1";
})

toContactButton.addEventListener("click", (e) => {
  e.preventDefault();
  contactSection.style.zIndex = "1";
});

// Works Section

const spanLevel = document.querySelectorAll(".skills .skill .level");

spanLevel.forEach((span) => (span.style.width = span.dataset.level));

// Clock Section
const sec = document.querySelector(".sec-hand"),
  min = document.querySelector(".min-hand"),
  hr = document.querySelector(".hr-hand");


const timeFunction = setInterval(() => {
    const timeNow = new Date();
    const seconds = timeNow.getSeconds() * 6;
    const minutes = timeNow.getMinutes() * 6;
    const hours = timeNow.getHours() * 30;
    
    sec.style.transform = `rotate(${seconds}deg)`;
    min.style.transform = `rotate(${minutes}deg)`;
    hr.style.transform = `rotate(${hours}deg)`;

}, 1000)
  

// Social Section

const socialButtons = document.querySelectorAll(".second .social li a");

socialButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
        e.preventDefault();
        button.classList.toggle("clicked");
    })
})