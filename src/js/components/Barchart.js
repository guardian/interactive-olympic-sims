import {
    select,
    selectAll
} from 'd3-selection';
import {
	dimensions,
	CyclingEasing,
	CyclingLinear
} from '../lib/cycling'
/*import {
	scaleLinear
} from 'd3-scale';*/
import {
	transition
} from 'd3-transition';
import {
	interpolateString
} from 'd3-interpolate';
import {
	arc as d3_arc
} from 'd3-shape';
import {
	convertTime,
	formatSecondsMilliseconds
} from '../lib/time';
import {
	describeArc,
	getAngle,
	toRad
} from '../lib/geometry';

export default function Barchart(data,options) {

	console.log("Barchart",data)

}