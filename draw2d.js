

document.addEventListener("DOMContentLoaded", async function() {
    const dataUrl = "CS Example Data File.json";
    const jsonData = await fetch(dataUrl).then(res => res.json());


    const sections = jsonData.polygonsBySection;
    const sectionSelect = document.getElementById("sectionSelect");

    sections.forEach(section => {
        let option = document.createElement("option");
        option.value = section.sectionName;
        option.textContent = section.sectionName;
        sectionSelect.appendChild(option);
    });

    sectionSelect.addEventListener("change", function() {
        draw2D(this.value);
    });


    function draw2D(sectionName) {
        const svg = d3.select("#viewer2D");
        svg.selectAll("*").remove();
    
        const section = sections.find(s => s.sectionName === sectionName);
        if (!section) return;


        const width = 500, height = 500;
    
        const xExtent = d3.extent(section.polygons.flatMap(p => p.points2D.map(d => d.vertex[0])));
        const yExtent = d3.extent(section.polygons.flatMap(p => p.points2D.map(d => d.vertex[1])));
    
        const xScale = d3.scaleLinear().domain(xExtent).range([50, width - 50]);
        const yScale = d3.scaleLinear().domain(yExtent).range([height - 50, 50]); // Reverse Y axis

        const infoBox = d3.select("#polygonInfo");

  
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5]) // Zoom limit
            .on("zoom", function (event) {
                const transform = event.transform;
                xScale.range([50 * transform.k, width - 50 * transform.k]);
                yScale.range([height - 50 * transform.k, 50 * transform.k]);
                svg.selectAll("polygon").attr("transform", transform);
                updateAxes();
            });
    
        svg.call(zoom);
    
        // Add x and y axis
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);
    
        svg.append("g")
            .attr("transform", "translate(0," + (height - 50) + ")")
            .call(xAxis);
    
        svg.append("g")
            .attr("transform", "translate(50, 0)")
            .call(yAxis);
    
        // Update the horizontal and vertical axis when user pans or zooms
        function updateAxes() {
            svg.selectAll(".x-axis")
                .call(xAxis);
            svg.selectAll(".y-axis")
                .call(yAxis);
        }

        // Choose polygon when user click
        svg.selectAll("polygon")
            .data(section.polygons)
            .enter().append("polygon")
            .attr("points", polygon => polygon.points2D.map(d => [xScale(d.vertex[0]), yScale(d.vertex[1])]).join(" "))
            .attr("fill", polygon => {
                // Add '#' to polygon.color
                let color = polygon.color;
                if (color && color[0] !== "#") {
                    color = "#" + color;
                }
                return color ?? "#cccccc"; // If don't have color, use gray to replace
            })            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .on("click", function (event, polygon) {
                // Highlight the chosen polygon
                d3.selectAll("polygon").attr("stroke", "black").attr("stroke-width", 1);
                d3.select(this).attr("stroke", "red").attr("stroke-width", 3); 

                // Show the information of that polygon
                infoBox.html(`
                    <h3>Polygon Info</h3>
                    <p><b>Symbol:</b> ${polygon.symbol ?? "No data"}</p>
                    <p><b>Symbol Description:</b> ${polygon.symbolDescription ?? "No data"}</p>
                `);
            })
            .on("mouseout", function () {
                d3.select(this).attr("stroke", "yellow").attr("stroke-width", 1);
            });
    }
    

    async function generateLegend() {
        const dataUrl = "CS Example Data File.json";
        const jsonData = await fetch(dataUrl).then(res => res.json());
    
        const sections = jsonData.polygonsBySection;
        const legendTable = document.querySelector("#legendTable tbody");
    
        let materials = new Map();
    
        // Loop through all polygons to get color and material description
        sections.forEach(section => {
            section.polygons.forEach(polygon => {
                if (!materials.has(polygon.color)) {
                    materials.set(polygon.color, polygon.symbolDescription ?? "Unknown Material");
                }
            });
        });
    
        // Detelte the old data before update
        legendTable.innerHTML = "";
    
        // Add data to table
        materials.forEach((description, color) => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td style="background: #${color}; width: 50px;"></td>
                <td>${description}</td>
            `;
            legendTable.appendChild(row);
        });
    }
    
    // Call function when loading
    generateLegend();
    
    draw2D(sections[0].sectionName);
});