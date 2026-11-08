/* Diaporama des pages projets : code personnalisé d'origine du gabarit « Projets Template » de Webflow,
   repris sans modification. Il copie les photos du projet dans les diapositives et retire celles en trop. */
(function () {
    var sliderId = 'MultiImageSlider';
    var collectionListWrapperId = 'MultiImageCollectionWrapper';
    var slideClass = 'w-slide';
    var leftArrowClass = 'w-slider-arrow-left';
    var rightArrowClass = 'w-slider-arrow-right';
    var slideNavClass = 'w-slider-nav';
    var collectionItemClass = 'w-dyn-item';
    
    var $slider = $('#' + sliderId);
    var $slides = $slider.find('.' + slideClass);
    var $collectionWrapper = $('#' + collectionListWrapperId);
    var $images = $collectionWrapper.find('.' + collectionItemClass);
    if ($slider && $collectionWrapper) {
        $slider.css('opacity', 0);
        if (!$images || !$images.length) {
            $slider.remove();
        }
        else {
            var imgCount = $images.length;
            var slideCount = $slides.length;
            if (imgCount > slideCount) imgCount = slideCount;
            for (var i = 0; i < imgCount; i++) {
                $slides[i].style.backgroundImage = $images[i].style.backgroundImage;
            }
            for (var i = slideCount; i > imgCount; i--) {
                $slides[i - 1].remove();
            }

            if (imgCount < 2) {
                $slider.find('.' + leftArrowClass + ', .' + rightArrowClass + ', .' + slideNavClass).remove();
            }
            $slider.css('opacity', 1);
        }
        $collectionWrapper.remove();
    }   
})();
