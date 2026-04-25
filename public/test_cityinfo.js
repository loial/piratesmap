const C=L.control.dialog({
    size: [600, 550],
    minSize: [400, 400],
    maxSize: [800, 800],
    anchor: [50, 50],
    position: 'topleft',
    initOpen: false
}).addTo(map);

function loadScript(url) {
    return new Promise((resolve, reject) => {
        var script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve(`${url} loaded successfully.`);
        script.onerror = () => reject(new Error(`Error loading script: ${url}`));
        document.head.appendChild(script);
    });
}

// Usage with Promises
loadScript('erainfo2.js')
    .then(message => {
        console.log(message)
        let table=document.createElement('table');
        erainfo["1560"].list.forEach(grp=>{
            let tr=document.createElement('tr');
            grp.forEach(cty=>{
                let td=document.createElement('td');
                let flag=document.createElement('img');
                flag.src='images/flag-medium-'+erainfo["1560"].cities[cty].nationality.slice(0,3).toLowerCase()+'.png';
                td.appendChild(flag);
                let e=document.createElement('span');
                e.innerHTML=cty;
                e.style.fontSize="larger";
                td.appendChild(e);
                tr.appendChild(td);
            });
            table.appendChild(tr);
            console.log(grp);
        });
        C.setContent(table.outerHTML);
        C._container.style.backgroundColor='#ccaa99';
        C.open();
    })
    .catch(error => console.error(error));

// script = document.createElement('script'); script.src='test_cityinfo.js'; document.head.appendChild(script);