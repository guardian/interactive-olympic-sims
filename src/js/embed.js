import iframeMessenger from 'guardian/iframe-messenger'
import embedHTML from './text/embed.html!text'

window.init = function init(el, config) {
    iframeMessenger.enableAutoResize();

    el.innerHTML = embedHTML;
    
};
