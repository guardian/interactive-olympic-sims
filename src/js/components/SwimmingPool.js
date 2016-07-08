import {
    select,
    selectAll
} from 'd3-selection';
import {
	dimensions
} from '../lib/swimming'


export default function SwimmingPool(options) {

	console.log("SwimmingPool",options)

	let box = options.container.getBoundingClientRect();
    let WIDTH = options.width || box.width,
        HEIGHT = options.height || box.height;

    let margins=options.margins;

    let hscale=options.scales.h.range([0,WIDTH-(margins.left+margins.right)]),
    	vscale=options.scales.v.range([0,HEIGHT-(margins.top+margins.bottom)])

    console.log("HSCALE",hscale.range(),"<=",hscale.domain(),"W:",WIDTH)
    console.log("BLOCK",dimensions.block,hscale(dimensions.block))
    console.log("LENGTH",dimensions.length,hscale(dimensions.length))

	let pool=select(options.container)
					.append("g")
					.attr("class","swimming-pool")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	pool.append("path")
			.attr("class","pool-line")
			.attr("d",()=>{
				return `M${hscale(0)},${vscale(dimensions.man_height)}
						
						l${hscale(dimensions.block)},0 
						
						l0,${vscale(dimensions.step)} 

						l0,${vscale(dimensions.depth)} 

						l${hscale(dimensions.length)},0 

						l0,${-vscale(dimensions.depth)} 

						l0,${-vscale(dimensions.step)}

						l${hscale(dimensions.block)},0 ` 

						//L${hscale(dimensions.length+hscale(0))},${vscale(-dimensions.step)}

						//L${hscale(dimensions.length+hscale(0)+dimensions.block)},${vscale(-dimensions.step)}`;
				// return `M0,${vscale(-dimensions.step)}
				// 		l${hscale(dimensions.block)},0 
				// 		l0,${vscale(dimensions.depth+dimensions.step)} 
				// 		l${hscale(dimensions.length)},0 
				// 		l0,${-vscale((dimensions.step+dimensions.depth))}
				// 		l${hscale(dimensions.block)},0 `;
			})

	this.addWater = () => {
		select(options.container)
				.append("g")
				.attr("class","water")
				.attr("transform",`translate(${margins.left},${margins.top})`)
					.append("rect")
						.attr("x",hscale(dimensions.block))
						.attr("y",vscale(dimensions.step+dimensions.man_height))
						.attr("width",hscale(dimensions.length))
						.attr("height",vscale(dimensions.depth))
	}
}