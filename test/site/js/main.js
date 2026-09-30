// Test stand-in for www.packacorp.com/js/main.js: the phone menu button.
(function () {
  var b = document.getElementById('navToggle'), l = document.getElementById('navList');
  if (b && l) b.onclick = function () { l.classList.toggle('open'); };
})();
