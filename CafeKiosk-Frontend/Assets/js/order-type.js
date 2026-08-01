let selectedService = null;

function selectCard(element, type) {
  // 📳 vibration feedback only
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }

  // remove previous selection
  document.querySelectorAll('.option-card').forEach(card => {
    card.classList.remove('selected', 'animate');
  });

  // add selection + animation
  element.classList.add('selected', 'animate');

  // remove animation after it plays
  setTimeout(() => {
    element.classList.remove('animate');
  }, 250);

  selectedService = type;
}

function confirmSelection() {
  if (!selectedService) {
    alert("Please select a service type first.");
    return;
  }

  localStorage.setItem("serviceType", selectedService);

  // slight delay for smoother UX
  setTimeout(() => {
    window.location.href = "menu.html";
  }, 150);
}