const projectName = "tribute-page";
jQuery(document).ready(function () {
  var navset,
    scrollPos = 0;

  jQuery("nav").wrap('<div class="nav-placeholder"></div>');
  jQuery("nav").wrapInner('<div class="nav-inner"></div>');
  jQuery(".nav-inner").wrapInner('<div class="nav-inner-most"></div>');

  function stickyUtility() {
    if (!jQuery("nav").hasClass("fixed")) {
      navset = jQuery("nav").offset().top;
    }
  }

  stickyUtility();

  jQuery(window).resize(function () {
    stickyUtility();
  });

  jQuery(window).scroll(function () {
    scrollPos = jQuery(window).scrollTop();

    if (scrollPos >= navset) {
      jQuery("nav").addClass("fixed");
    } else {
      jQuery("nav").removeClass("fixed");
    }
  });
});
