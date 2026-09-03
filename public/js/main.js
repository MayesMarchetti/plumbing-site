document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      var expanded = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.has-dropdown > a.nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.innerWidth <= 860) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      document.getElementById('form-success').classList.add('visible');
      contactForm.reset();
    });
  }

  var bookingForm = document.getElementById('booking-form');
  var bookingStatus = document.getElementById('booking-status');
  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn = bookingForm.querySelector('button[type="submit"]');
      var selectedTimeOption = bookingForm.time.selectedOptions[0];
      var payload = {
        name: bookingForm.name.value,
        email: bookingForm.email.value,
        phone: bookingForm.phone.value,
        service: bookingForm.service.value,
        date: bookingForm.date.value,
        time: bookingForm.time.value,
        startHour: selectedTimeOption ? selectedTimeOption.dataset.startHour : '',
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      setBookingStatus('', '');

      fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.ok) {
            setBookingStatus('success', "Thanks! Your appointment request has been received. Our team will call to confirm your time.");
            bookingForm.reset();
          } else {
            setBookingStatus('error', result.data.error || 'Something went wrong. Please call us instead.');
          }
        })
        .catch(function () {
          setBookingStatus('error', 'Could not reach the server. Please call us instead.');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Request Appointment';
        });
    });
  }

  function setBookingStatus(type, message) {
    if (!bookingStatus) return;
    bookingStatus.textContent = message;
    bookingStatus.classList.remove('success', 'error');
    if (type) bookingStatus.classList.add(type);
  }
});
