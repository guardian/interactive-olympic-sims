import {
    select,
    selectAll
} from 'd3-selection';


export default function Track(options) {

	//console.log("Track",options)

	let dimensions=options.dimensions;

	let box = options.container.getBoundingClientRect();
    let WIDTH = options.width || box.width,
        HEIGHT = options.height || box.height;

    let margins=options.margins;

    let hscale=options.scales.h.range([0,WIDTH-(margins.left+margins.right)]),
    	vscale=options.scales.v.range([0,HEIGHT-(margins.top+margins.bottom)])

	let track=select(options.container)
					.append("g")
					.attr("class","track")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	track.append("path")
			.attr("class","pool-line")
			.attr("d",()=>{

				//console.log(hscale(0),vscale(dimensions.man_height))

				return `M${hscale(0)},${vscale(dimensions.man_height)}
						
						l${hscale(dimensions.length)},0` 

			})

}