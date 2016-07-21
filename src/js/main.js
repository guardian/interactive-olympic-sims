import mainHTML from './text/main.html!text'
import swimming_data from '../assets/data/men_medley_200.json!json'
import swimming_text from '../assets/data/texts/men_medley_200.json!json'
// import swimming_data200 from '../assets/data/men_medley_200.json!json'
// import running_data100 from '../assets/data/men_running_100.json!json'
// import running_data200 from '../assets/data/men_running_200.json!json'
// import running_data400 from '../assets/data/men_running_400.json!json'
//import runnning_data from '../assets/data/men_running_4x100.json!json'
import records from '../assets/data/records.json!json'
// import SwimmingSimulation from './components/SwimmingSimulation';
// import Swimming from './components/Swimming';
// import SwimmingExploded from './components/SwimmingExploded';
// import SwimmingLineChart from './components/SwimmingLineChart';

import SwimmingPerspective from './components/SwimmingPerspective';
// import RunningPerspective from './components/RunningPerspective';

// import Running from './components/Running';

// import men_running_marathon from '../assets/data/men_running_marathon.json!json'
// import women_running_marathon from '../assets/data/women_running_marathon.json!json'

// import men_running_50km_walk from '../assets/data/men_running_50km_walk.json!json'
// import LongDistanceRace from './components/LongDistanceRace';

// import men_triathlon from '../assets/data/men_triathlon_2012.json!json'
// import Triathlon from './components/Triathlon';

// import men_team_pursuit from '../assets/data/men_cycling_track_team_pursuit.json!json'
// import TeamPursuit from './components/TeamPursuit';



export function init(el, context, config, mediator) {
    el.innerHTML = mainHTML.replace(/%assetPath%/g, config.assetPath);

    // let team_pursuit=new TeamPursuit(men_team_pursuit,{
    //     container:el.querySelector(".interactive-container"),
    //     race:"team_pursuit",
    //     title:"Team Pursuit, Men",
    //     margins: {
    //         left:40,
    //         right:40,
    //         top:40,
    //         bottom:40
    //     },
    //     multiplier:1
    // })
/*
    let triathlon=new Triathlon(men_triathlon,{
        container:el.querySelector(".interactive-container"),
        race:"triathlon",
        title:"Triathlon, Men",
        margins: {
            left:20,
            right:20,
            top:20,
            bottom:20
        }
    })*/

    // let walk50km=new LongDistanceRace(men_running_marathon,{
    //     container:el.querySelector(".interactive-container"),
    //     race:"50km_walk",
    //     title:"50km Race walk, Men",
    //     margins: {
    //         left:40,
    //         right:40,
    //         top:20,
    //         bottom:20
    //     }
    // })


    // let wmarathon=new LongDistanceRace(women_running_marathon,{
    //     container:el.querySelector(".interactive-container"),
    //     race:"marathon",
    //     title:"Marathon, Women",
    //     margins: {
    //         left:60,
    //         right:40,
    //         top:20,
    //         bottom:40
    //     }
    // })

    /**/


    /*let race400=new Running(running_data400,{
        container:el.querySelector(".interactive-container"),
        multiplier:1,
        race:"400m"
    })

    let race200=new Running(running_data200,{
        container:el.querySelector(".interactive-container"),
        multiplier:1,
        race:"200m"
    })

    let race100=new Running(running_data100,{
        container:el.querySelector(".interactive-container"),
        multiplier:1,
        race:"100m"
    })*/

    new SwimmingPerspective(swimming_data,{
        container:el.querySelector(".interactive-container"),
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

    /*new RunningPerspective(running_data100,{
        container:el.querySelector(".interactive-container"),
        record:records.men_freestyle_100,
        multiplier: 1,
        margins: {
            left:10,
            right:10,
            top:10,
            bottom:10
        }
    })*/

    /*new SwimmingPerspective(swimming_data200,{
        container:el.querySelector(".interactive-container"),
        record:records.men_freestyle_100,
        multiplier: 1,
        margins: {
            left:10,
            right:10,
            top:10,
            bottom:10
        }
    })*/

    /*new Swimming(swimming_data200,{
        container:el.querySelector(".interactive-container"),
        record:records.men_freestyle_100,
        multiplier: 1,
        margins: {
            left:5,
            right:5,
            top:5,
            bottom:5
        }
    })

    new SwimmingLineChart(swimming_data,{
        container:el.querySelector(".interactive-container"),
        record:records.men_freestyle_100,
        multiplier: 1,
        margins: {
            left:10,
            right:170,
            top:20,
            bottom:20
        }
    })*/
/*
    new SwimmingExploded(swimming_data,{
        container:el.querySelector(".interactive-container"),
        record:records.men_freestyle_100,
        multiplier: 1,
        margins: {
            left:5,
            right:5,
            top:5,
            bottom:5
        }
    })*/

    /*let mmarathon=new LongDistanceRace(men_running_marathon,{
        container:el.querySelector(".interactive-container"),
        race:"marathon",
        title:"Marathon, Men",
        margins: {
            left:60,
            right:40,
            top:20,
            bottom:20
        }
    })*/

}
