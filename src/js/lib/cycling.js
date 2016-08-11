import {
	bezier
} from './bezier';
import {
	range
} from 'd3-array';
import {
	getArcLength,
	getAngle
} from './geometry';

export const CyclingEasing=bezier(.52,.04,.8,.8); //using http://cubic-bezier.com/ to calculate parameters
export const CyclingLinear=bezier(0.5,0.5,0.5,0.5);
let bycicle_length=0.972+0.660;
export const dimensions = {
	field:{
		width:85.73,
		height:50.0
	},
	length:250,
	radius:25.0,
	lane:8,
	lane_width:8,
	line_width:0.05,
	running_line:[0],
	lane_staggers:[0,125],
	team_length:bycicle_length*4+0.05*4
}