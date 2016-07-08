import {
	bezier
} from './bezier';

export const DiveEasing=bezier(0,0.4,0.7,0.7); //using http://cubic-bezier.com/ to calculate parameters
export const SwimmingLinear=bezier(0.5,0.5,0.5,0.5);
export const SwimmingEasing=bezier(0.1,0.15,0,0);

export const dimensions = {
    block:2,
    lan:2.5,
    length:50,
    step:0.25,
    depth:3,
    backstroke_turn:5,
    false_start_rope:15,
    man_height:2
}