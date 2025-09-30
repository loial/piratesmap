
//    <!-- <script src="https://docs.opencv.org/4.x/utils.js" type="text/javascript"></script> -->
//    <script src="opencv-utils.js" type="text/javascript"></script>
//    <script type="text/javascript">
UTILS_URL="opencv-utils.js";
let utilscript = document.createElement('script');
utilscript.setAttribute('async', '');
utilscript.setAttribute('type', 'text/javascript');
utilscript.addEventListener('load', async () => {
    window.utils = new Utils('errorMessage');
    utils.loadOpenCv(async () => {
        dialog();
      });
    //utils.loadImageToCanvas('imgprocess/treasure_raw.png', 'mapPiece');

    //    dialog();
});
utilscript.addEventListener('error', () => {
    console.log('Failed to load ' + UTILS_URL);
});
utilscript.src = UTILS_URL;

let node = document.getElementsByTagName('script')[0];
node.parentNode.insertBefore(utilscript, node);

const dialog=()=>{
    let dlg=document.getElementById('dlgAnalyze');
    if (! dlg) {
        dlg=L.DomUtil.create("dialog",null,document.firstChild);dlg.id="dlgAnalyze";
        let t=L.DomUtil.create("h2",null,dlg);t.innerText="Map piece analyzer";
        let p=L.DomUtil.create("p",null,dlg);p.innerText="Load a screenshot of a map piece to add as marker";
        let c=L.DomUtil.create("canvas",null,p);c.id="mapPiece";
        let i=L.DomUtil.create("input",null,p);i.id="fileInput";i.type="file";i.name="file";i.accept="image/*"
        let b1=L.DomUtil.create("button",null,p);b1.innerText="Analyze";b1.id="btnAnalyze";
        b1.addEventListener('click',()=> {analyze();});
        let loader=L.DomUtil.create("img","hidden",b1);loader.src="images/loader.gif";loader.id="loader";
        loader.show=()=>{loader.classList.remove("hidden")};loader.hide=()=>{loader.classList.add("hidden")};
        let s=L.DomUtil.create("style",null,document.getElementsByTagName("head")[0]);s.innerText=".hidden {display: none;}"
        let info=L.DomUtil.create("code",null,dlg);info.id="info";
            b=L.DomUtil.create("button",null,dlg);b.innerText="Close";b.id="closeModal";
            b.addEventListener('click',()=> {dlg.close();});

        utils.addFileInputHandler('fileInput', 'mapPiece');
        dlg.addEventListener('close',()=>{
            let f=document.getElementById('fileInput'); f.value='';
            let c=document.getElementById('mapPiece');c.removeAttribute("width");c.removeAttribute("height");
        })
    }
    dlg.showModal();
}

      
    
    
      async function analyze() {
        let wordImgs= {
            sister: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAMCAYAAACJOyb4AAAAoUlEQVR4AdSQUQ2AMBBDFxzgBS1YQBMW0IIXJADvRi/jAnwQ9gFJ02vXdRvNPI1rLTSp4ndZ3vXD7ZFPa3HTZfn+m2LulfZybgRoMW6ZUmIGqMjyoi/t5QRPN15wMuRHpkReTubLyPNyDMIKid0/XiJfzB4y0uVs5QSAAmI8YLp4iXu2kG97jCeyck4TWGUWMwM0YAblXGp8wcolvub/lm8AAAD//zo/yXAAAAAGSURBVAMAt1qQW9oUtE0AAAAASUVORK5CYII=",
            mother: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAMCAYAAACTB8Z2AAAAkUlEQVR4AdyQ0QmAMAxES2dyFldwJldwFndSX+AkhBYraj8Ujlwu6V1tXpd564WcHn7DOCXQYnM7zBvDj1dJ4JOwFtPajv0ZN4zQAen0cF/FpcdeuqqFsaSnUEVjyffiqux4HveZe+0MY/AGvDl+/jKXYfEwBmjUGmpzC1N6qUqTMT2gL1U04OdwYGGQHvhv2A4AAP//p+Oz/gAAAAZJREFUAwAU1qCTJxycMwAAAABJRU5ErkJggg==",
            uncle: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAMCAYAAACNzvbFAAAAgklEQVR4AdSP0QmAQAxD5WZyFldwJldwFndSXzFSShHR/pzwaBJ70WvbuuzVtOHHM05zevpzKYXnDWtL07YrtD/lq3hNaTzgAQ3oCDmQWykiw1+PA3iIu3qn/LFUS2+mL75LCTmsiY7wDpR7TSZvpVzJwwI+TjJQHrW8lbJUST+lBwAAAP//UniRvwAAAAZJREFUAwBkeXw/bOpDIgAAAABJRU5ErkJggg==",
            inca: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAMCAYAAACA0IaCAAAAfElEQVR4AcyP0QmAMAxES2dyFldwJldwFndSX+CVIi2o9EPhvEvTPNK8b+sxSjkN/ApsmpekvvIL7HpqMPQoXv4K7D7nlrg9MurVXRgD9ZZAqBE9a7IqsFbTS089YIAY0Mkt0Uf2zHrAWF15kZpcOxl5TlacBYwwQv+FnQAAAP//YyZ/IAAAAAZJREFUAwAP0nMjxnnBIQAAAABJRU5ErkJggg==",
            treasure: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAMCAYAAADoIwS6AAAAtUlEQVR4AeyS0Q3CMBBDo27ALszCCszECszCLowAeSc5ci2lv+lHKzln3/kiq+32eb9+Z8HWTvSMMPfHs7Xb2mQjTMX41rnsqDD1VnqEWe2jxgzAARzABTRAZz3qyVth+g+Mt6kiMEg7zxnaoR3vOfe7nOOpMJBEXpqL6Uezgw8+Ax6f4VdvF4aBG5P7XNyruPakVdXPqvkIQzqAURUO0EJq+tlL7R5mAn2B3giDWI0rzOwL/AEAAP//vVcYYQAAAAZJREFUAwCUQdID3x8MTQAAAABJRU5ErkJggg==",
            lost: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAYAAABr5z2BAAAAgklEQVR4AcSPwRGAIAwEM9RkLbZgTbRgC7ZAL5agbiTKBB6KD505cxfCRkOa4/ZFQfIzjFN274oCuHx8xeObzNuwAiz01CaADciAeET2tQIw0Pod6/laAdjixSXAvk++AOUAPi2Rc8EjDcXLegpgA+KcimQlieBNZ+fukRWA6dX/gB0AAP//R68kxAAAAAZJREFUAwAMN2H5ZRc3nQAAAABJRU5ErkJggg=="
        }
        let masks={
            treasure: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABH0lEQVR4AeSQ7RGCMBBET0qwBGqxFq0Ja6EWSrAFzMvMZo4zIwmMv2R43lduVzLYj58/MJjutxWO3mT1ihAUEo61+nuxGEiA+G1pbx53BxvH5it4zItBj8kw3ca8FJ19jShwFvxsL89XxBIC8TA9YA5x3lJnAw4igBg5EegBOTDrpRiwKDEi0DvL8HjOlxYRGXIeWnY4k79gbwFxzgBL8DJbgVxQe+hnAxK/TC3og2oiIkTwObW4muWbKQaWHi9EDqm9eWuCsSdxFjcGNGxZLjXhPEs/LItUllcmzEozJZ8Gqdn6RrFYo3PKAAGPvsL3ThnUBGPvsIGEuBbw/5qZOGTAshckjybqdRvUxBEDb6K824BFD8IezdTrNtBia3wDAAD//+TIY+cAAAAGSURBVAMAzb+JMUfYx6AAAAAASUVORK5CYII=",
            family: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAMCAYAAABbayygAAAAeElEQVR4AXSOgQmAMBADa0dxFmfRmXQWZ3EV5R6uREEh9JPc1/YW374udyqqNkCALJgzKzADgJRdgVls55V2zN0NAGTDjPAwdaMB4Vd2Be7L3JSgnpOsQAZloffs23FOmr8T5nUj70nlYoFsEPLbFJldgRkwKyH8AwAA//+RpTKWAAAABklEQVQDAHfcQiFKPwLGAAAAAElFTkSuQmCC"
        }
          
        let btnAnalyze = document.getElementById('btnAnalyze');
        let loader = document.getElementById('loader');
        loader.show();
        btnAnalyze.setAttribute('disabled',"");
      
        let info=document.getElementById('info');
        info.innerText="";
        let offset={x:0,y:0}
        let foundWord="";
        let type="";
      
        /*
        STEP ZERO - Make sure screenshot is resized
                    Tested with VGA2HDMI (960x600) and FS_UAE (752x572)
        */
        console.log("Begin analyzing map");
      
        let piece = cv.imread('mapPiece');
        if (piece.cols>750 && piece.rows>570) {
          cv.resize(piece, piece, new cv.Size(piece.cols/2,piece.rows/2), 0, 0, cv.INTER_NEAREST);
          console.log("Resized map to "+piece.cols+"x"+piece.rows);
        }
      
        let dst = new cv.Mat();
        let mask = new cv.Mat();
        let tmp=document.createElement("canvas");
        let tmpImage = new Image();
        let search = new cv.Mat();
        let color = new cv.Scalar(255, 0, 0, 255);
      
        /*
        STEP ONE - Identify type of map
        */
        console.log("Looking for text");
      
        for (word in wordImgs) {
          tmpImage.src=wordImgs[word]
          await new Promise(r => {tmpImage.onload = r})
          search=cv.imread(tmpImage);
          cv.matchTemplate(piece,search,dst,cv.TM_CCOEFF_NORMED,mask);
          result=cv.minMaxLoc(dst,mask);
          if (result.maxVal >= 0.99) {
            (s=>{
              console.log(s);
              info.innerText+=s+"\n";
            })("Identified: "+word);
            let maxPoint = result.maxLoc;
            search.delete();
            foundWord=word;
            break;
          }
        }
        if (foundWord) {
          switch (foundWord) {
            case "treasure":
            case "inca":
                  type="treasure"
                  break;
            case "sister":
            case "mother":
            case "uncle":
            case "lost":    // <-- this one is a fallback for all family members not directly recognized yet
                  type="family"
                  break;
          }
          (s=>{
              console.log(s);
              info.innerText+=s+"\n";
            })("Type: "+type);
          
          
          /*
             STEP TWO.x - crop image
              1: Mask all non-map parts of the image:
                  - black background
                  - info box and text
                  - frame
              2: Apply mask, so we remove unwanted stuff, even if infobox is overlapping the map piece
              3: Using the mask, Identify remaining countour,
                  (if infobox overlapped with the map, the countour might be irreagular)
                  (anyway it will be jagged because of the "teared" frame)
              4: Calculate rectangular shape encompassing the contour
              5: Crop down to the rectangle
            */
          // TWO.1 mask all non-map parts
          let removecolors = [
                            // background:  
                  "000000", //   black
                            // label:
                  "ccaa99", //   beige
                  "0000cc", //   blue
                            // frame:
                  "775533", //   
                  "664433", //   
                  "aa8855", //   
                  "ccaa77", //   
          ]
          let mergedMask = null;
          let tmpMask=new cv.Mat();
          console.log("Masking non-map elements");
          for (r of removecolors) {  
            let low = new cv.Mat(piece.rows, piece.cols, piece.type(), [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 0]);
            let high = new cv.Mat(piece.rows, piece.cols, piece.type(), [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 255]);
            cv.inRange(piece, low, high, tmpMask);
            if (mergedMask) {
              cv.bitwise_or(tmpMask,mergedMask,mergedMask);
            } else {
              mergedMask=tmpMask.mat_clone()
              //new cv.Mat();
              //cv.bitwise_or(tmpMask,tmpMask,mergedMask);
            }
            low.delete(); high.delete();
          }
          tmpMask.delete();
          cv.bitwise_not(mergedMask,mergedMask);
        
          // TWO.3 Identify contour
          //      should only be one, fairly rectangular object, possible with infobox cutout 
          let contours = new cv.MatVector();
          let hierarchy = new cv.Mat();
          cv.findContours(mergedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          console.log("Found "+contours.size()+" shapes")
        
          // TWO.3 Crop to rectangle around countour
          let rect = cv.boundingRect(contours.get(0));
          piece = piece.roi(rect);
          mergedMask=mergedMask.roi(rect);
          contours.delete(); hierarchy.delete();
        
          /*
                STEP TWO.4 - Find marker offset within map
          */
        
          console.log("Finding map/marker offset");
          tmpImage.src=masks[type];
          await new Promise(r => {tmpImage.onload = r})
        
          search=cv.imread(tmpImage);
        
          let channels = new cv.MatVector();
          cv.split(search, channels);
          let alphaMask = channels.get(3); // Assuming alpha is the 4th channel (index 3)
          channels.delete(); // Clean up the MatVector
        
          cv.matchTemplate(piece, search, dst, cv.TM_CCORR_NORMED , alphaMask);
          alphaMask.delete();
          let result = cv.minMaxLoc(dst, mask);
          if (result.maxVal >= 0.99) {
            let maxPoint = result.maxLoc;
            //let offset=structuredClone(maxPoint);
            switch (type) {
              case "family":
                  offset={x:maxPoint.x+5,y:maxPoint.y+6}
                  //offset.x=offset.x+5
                  //offset.y=offset.y+6
                  break;
              case "treasure":
                  offset={x:maxPoint.x+17,y:maxPoint.y+17}
                  //offset.x=offset.x+17
                  //offset.y=offset.y+17
                  break;
            }
            (s=>{
              console.log(s);
              info.innerText+=s+"\n";
            })("Offset: "+offset.x+","+offset.y);
            //color = new cv.Scalar(0, 0, 255, 255);
            //let point = new cv.Point(maxPoint.x + search.cols, maxPoint.y + search.rows);
            //cv.rectangle(piece, maxPoint, point, color, 2, cv.LINE_8, 0);
            //color = new cv.Scalar(0, 255, 0, 255);
            //cv.circle(piece, offset, 2, color, 1);
            search.delete();
          }
        
          /*
             STEP TWO.5 - Prepare for matching with the full map
                      Let's mask the marker from the image: (so template matching ignores it)
          */
          console.log("Mask out marker")
          const removemarker = [
                  "996644", //   brown (mask, chest)
                  "002222", //   darkgrey (mask, chest)
                  "ee0000", //   red (X)
          ]
          //mergedMask = null;
          cv.bitwise_not(mergedMask,mergedMask);
          tmpMask=new cv.Mat();
          for (r of removemarker) {
            let low = new cv.Mat(piece.rows, piece.cols, piece.type(), [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 0]);
            let high = new cv.Mat(piece.rows, piece.cols, piece.type(), [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 255]);
            cv.inRange(piece, low, high, tmpMask);
            cv.bitwise_or(tmpMask,mergedMask,mergedMask);
            low.delete(); high.delete();
          }
          tmpMask.delete();
          cv.bitwise_not(mergedMask,mergedMask);
        
          console.log("applying mask");
        
          channels = new cv.MatVector();
          cv.split(piece, channels);
          let newChannels = new cv.MatVector();
          [0,1,2].forEach(e=>{newChannels.push_back(channels.get(e))})
          newChannels.push_back(mergedMask);
          cv.merge(newChannels, piece);
          channels.delete(); newChannels.delete();
        
        
        
          /*
          STEP FOUR - Run match template against baseTreasureMap
          */
          //const offset={x:223,y:150}
          console.log("Loading TreasureMapBase");
          tmpImage.src='map/PiratesTreasureMapBase.png';
          await new Promise(r => {tmpImage.onload = r})
          let baseMap=cv.imread(tmpImage);
          tmpImage=null; // not sure if removing reference will free up any memory... this is a LARGE image...
          // TODO?: Apply city overlay for correct era, for even better matching, when cities are part of the map piece
          console.log("Template matching map piece against MapBase"); 
          //cv.bitwise_not(mergedMask,mergedMask);
          try {
            cv.matchTemplate(baseMap,piece,dst,cv.TM_CCOEFF_NORMED,mergedMask);
          } catch (e) {
            console.log("OpenCv.js error:",e);
          }
          result=cv.minMaxLoc(dst,mask);
          if (result.maxVal >= 0.99) {
            let maxPoint = result.maxLoc;
            let mapPoint={
              x: maxPoint.x+offset.x,
              y: maxPoint.y+offset.y
            };

            (s=>{
                console.log(s);
                info.innerText+=s+"\n";
            })("baseMap location: "+mapPoint.x+","+mapPoint.y);            
            baseMap.delete();  
            /* 
            Step FIVE - Calculate lat/long coordinates
            */
                  // TODO
            /* 5120x3208 pixels, PxPerLong = 134.1, PxPerLat = 193.33, LeftLong = 96,744W, RightLong = 58,563, TopLat = 30,279N, BotLat = 13,687N */
            function baseMapPixelToLatLng(x,y) {
              // basemap is 5120 pixels wide, which corresponds to Longitudes
              let maxX=5120
              let maxY=3208
              let minLat = 30.279;
              let minLng = -96.744;
              let maxLat = 13.687;
              let maxLng = -58.563;
              let distLat=maxLat-minLat
              let distLng=maxLng-minLng
              let pxPerLat=maxY/distLat
              let pxPerLng=maxX/distLng
              let lng=x/pxPerLng+minLng
              let lat=y/pxPerLat+minLat
              return {lat: lat, lng: lng}

            }
            let latLng=baseMapPixelToLatLng(mapPoint.x,mapPoint.y);

            /*
            Step SIX - generate GeoJSON for marker to import in "piratesmap"
            */
            function getGeoJSON(latLng,type,word) {

              let obj={
                type: "Feature",
                properties:{},
                geometry: {
                  type: "Point",
                  coordinates: [
                    latLng.lng,
                    latLng.lat
                  ]
                }
              }
              switch (type) {
                case "treasure":
                    obj.properties["type"]=foundWord;
                    break;
                case "family":
                    obj.properties["type"]=type;
                    if (foundWord=="lost"){
                        obj.properties["description"]="family member";
                    } else {
                        obj.properties["description"]=foundWord;
                    }
                    break;
              }
              return JSON.stringify(obj);

            }
            let markerJSON=getGeoJSON(latLng,type,word);

            info.innerText+=markerJSON+"\n"; 
            let button=L.DomUtil.create("button");button.innerText="Import marker";info.append(button);
            const clickFunction=function(){
                let obj=JSON.parse(this)
                markerGroup.addData(obj);
                document.getElementById("dlgAnalyze").close();
                let latlng={lat:obj.geometry.coordinates[1],lng:obj.geometry.coordinates[0]}
                map.flyTo(latlng);
            }
            button.addEventListener('click',clickFunction.bind(markerJSON))
          }
              
        }
        
        piece.delete(); dst.delete(); mask.delete();
      
        btnAnalyze.removeAttribute('disabled');
        loader.hide();
        console.log("Finished analyzing");
      
      }
