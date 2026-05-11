// Home screen — loads saved star count
(function() {
  const stars = parseInt(localStorage.getItem('jamaris_stars') || '0', 10);
  document.getElementById('homeStars').textContent = stars;
})();
