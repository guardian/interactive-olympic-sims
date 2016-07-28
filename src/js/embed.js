import iframeMessenger from 'guardian/iframe-messenger'
import embedHTML from './text/embed.html!text'

import swimming_data from '../assets/data/men_medley_200.json!json'
import swimming_text from '../assets/data/texts/men_medley_200.json!json'

import records from '../assets/data/records.json!json'

import SwimmingPerspective from './components/SwimmingPerspective';

window.init = function init(el, config) {
    iframeMessenger.enableAutoResize();

    el.innerHTML = embedHTML;

    console.log("SWIMMING SwimmingPerspective",el)

    new SwimmingPerspective(swimming_data,{
        container:el,
        text:swimming_text,
        record:records.men_medley_200,
        multiplier: 1,
        margins: {
            left:10,
            right:10,
            top:10,
            bottom:10
        }
    })
    
};
