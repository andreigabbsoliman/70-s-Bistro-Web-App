// About-only behavior: allow the history image to be focused on click.
document.addEventListener("DOMContentLoaded", () => {
    const image = document.querySelector(".about-image");
    image?.addEventListener("click", () => image.classList.toggle("is-focused"));
});
