document.addEventListener("DOMContentLoaded", async function() {
    const dataUrl = "CS Example Data File.json";
    const jsonData = await fetch(dataUrl).then(res => res.json());
    const sections = jsonData.polygonsBySection;
    const sectionSelect = document.getElementById("sectionSelect");
  
    // Thêm danh sách section vào dropdown
    sections.forEach(section => {
      let option = document.createElement("option");
      option.value = section.sectionName;
      option.textContent = section.sectionName;
      sectionSelect.appendChild(option);
    });
  
    sectionSelect.addEventListener("change", function() {
      draw2D(this.value);
    });
  
    // Vẽ lần đầu
    if (sections.length > 0) {
      draw2D(sections[0].sectionName);
    }
  
    function draw2D(sectionName) {
      const svg = d3.select("#viewer2D");
      svg.selectAll("*").remove();
  
      const section = sections.find(s => s.sectionName === sectionName);
      if (!section) return;
  
      const width = 1000, height = 600;
      const margin = 50;
      svg.attr("width", width).attr("height", height);
  
      // Lấy dữ liệu từ polygons và boreholes
      const polyX = section.polygons.flatMap(p => p.points2D.map(d => d.vertex[0]));
      const polyY = section.polygons.flatMap(p => p.points2D.map(d => d.vertex[1]));
      const boreX = section.boreholes ? section.boreholes.map(b => b.x) : [];
      const boreY = section.boreholes ? section.boreholes.map(b => b.elevation) : [];
      const allX = polyX.concat(boreX);
      const allY = polyY.concat(boreY);
  
      if (allX.length === 0 || allY.length === 0) {
        console.warn("No data to draw 2D.");
        return;
      }
  
      const xExtent = d3.extent(allX);
      const yExtent = d3.extent(allY);
  
      // Scale ban đầu
      let xScale = d3.scaleLinear().domain(xExtent).range([margin, width - margin]);
      let yScale = d3.scaleLinear().domain(yExtent).range([height - margin, margin]);
  
      // Tạo trục
      let xAxis = d3.axisBottom(xScale).ticks(10);
      let yAxis = d3.axisLeft(yScale).ticks(10);
  
      const xAxisG = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin})`)
        .call(xAxis);
  
      const yAxisG = svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin},0)`)
        .call(yAxis);
  
      // Vẽ grid
      const xGrid = d3.axisBottom(xScale)
        .tickSize(-(height - 2*margin))
        .tickFormat("")
        .ticks(10);
  
      svg.append("g")
        .attr("class", "x-grid")
        .attr("transform", `translate(0, ${height - margin})`)
        .call(xGrid);
  
      const yGrid = d3.axisLeft(yScale)
        .tickSize(-(width - 2*margin))
        .tickFormat("")
        .ticks(10);
  
      svg.append("g")
        .attr("class", "y-grid")
        .attr("transform", `translate(${margin},0)`)
        .call(yGrid);
  
      // Nhóm chứa dữ liệu
      const dataGroup = svg.append("g").attr("class", "data-group");
  
      // Hàm vẽ polygons
      function drawPolygons() {
        dataGroup.selectAll("polygon").remove();
  
        dataGroup.selectAll("polygon")
          .data(section.polygons)
          .enter().append("polygon")
          .attr("points", polygon => {
            return polygon.points2D.map(d => {
              const x = xScale(d.vertex[0]);
              const y = yScale(d.vertex[1]);
              return [x, y];
            }).join(" ");
          })
          .attr("fill", polygon => {
            let color = polygon.color;
            if (color && color[0] !== "#") {
              color = "#" + color;
            }
            return color ?? "#cccccc";
          })
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .on("mouseover", function() {
            d3.select(this).attr("stroke-width", 4);
          })
          .on("mouseout", function() {
            d3.select(this).attr("stroke-width", 1);
          })
          .on("click", function(event, polygon) {
            d3.selectAll("polygon").attr("stroke", "black").attr("stroke-width", 1);
            d3.select(this).attr("stroke", "red").attr("stroke-width", 3);
            d3.select("#polygonInfo").html(`
              <h3>Polygon Info</h3>
              <p><b>Symbol:</b> ${polygon.symbol ?? "No data"}</p>
              <p><b>Symbol Description:</b> ${polygon.symbolDescription ?? "No data"}</p>
            `);
          });
      }
  
      // Hàm vẽ boreholes dưới dạng cột (cylinder dạng 2D: thể hiện bằng circle)
      function drawBoreholes() {
        dataGroup.selectAll(".borehole").remove();
  
        if (!section.boreholes) return;
        dataGroup.selectAll(".borehole")
          .data(section.boreholes)
          .enter().append("circle")
          .attr("class", "borehole")
          .attr("cx", d => xScale(d.x))
          .attr("cy", d => yScale(d.elevation))
          .attr("r", 6)
          .attr("fill", "blue")
          .attr("stroke", "black")
          .on("mouseover", function(event, b) {
            d3.select("#polygonInfo").html(`
              <h3>Borehole Info</h3>
              <p><b>Name:</b> ${b.name}</p>
              <p><b>Elevation:</b> ${b.elevation}</p>
              <p><b>Depth:</b> ${b.depth}</p>
            `);
          })
          .on("mouseout", function() {
            d3.select("#polygonInfo").html(`
              <h3>Polygon Info</h3>
              <p>Click on a polygon to see details.</p>
            `);
          });
      }
  
      // Vẽ ban đầu
      drawPolygons();
      drawBoreholes();
  
      // Sử dụng một biến toàn cục transform cho cả zoom và drag
      let globalTransform = d3.zoomIdentity;
      let startX, startY;
  
      // Thiết lập zoom (zoom và pan bằng d3.zoom)
      const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", zoomed);
  
      svg.call(zoom);
  
      function zoomed(event) {
        globalTransform = event.transform;
        updateAll();
      }
  
      // Thiết lập drag cho dataGroup
      const drag = d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded);
  
      dataGroup.call(drag);
  
      function dragStarted(event) {
        startX = event.x;
        startY = event.y;
      }
  
      function dragged(event) {
        const dx = event.x - startX;
        const dy = event.y - startY;
        globalTransform = globalTransform.translate(dx, dy);
        updateAll();
        startX = event.x;
        startY = event.y;
      }
  
      function dragEnded(event) {
        console.log("Final transform:", globalTransform);
      }
  
      function updateAll() {
        // Tạo scale mới dựa trên globalTransform
        const newXScale = globalTransform.rescaleX(xScale);
        const newYScale = globalTransform.rescaleY(yScale);
  
        // Cập nhật trục
        xAxisG.call(xAxis.scale(newXScale));
        yAxisG.call(yAxis.scale(newYScale));
        svg.select(".x-grid").call(xGrid.scale(newXScale));
        svg.select(".y-grid").call(yGrid.scale(newYScale));
  
        // Cập nhật vị trí polygon
        dataGroup.selectAll("polygon")
          .attr("points", polygon => {
            return polygon.points2D.map(d => {
              const x = newXScale(d.vertex[0]);
              const y = newYScale(d.vertex[1]);
              return [x, y];
            }).join(" ");
          });
  
        // Cập nhật vị trí boreholes
        dataGroup.selectAll(".borehole")
          .attr("cx", d => newXScale(d.x))
          .attr("cy", d => newYScale(d.elevation));
      }
      
      async function generateLegend() {
        const dataUrl = "CS Example Data File.json";
        const jsonData = await fetch(dataUrl).then(res => res.json());
    
        const sections = jsonData.polygonsBySection;
        const legendTable = document.querySelector("#legendTable tbody");
    
        let materials = new Map();
    
        sections.forEach(section => {
            section.polygons.forEach(polygon => {
                if (!materials.has(polygon.color)) {
                    materials.set(polygon.color, polygon.symbolDescription ?? "Unknown Material");
                }
            });
        });
    
        legendTable.innerHTML = "";
    
        materials.forEach((description, color) => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td style="background: #${color}; width: 50px;"></td>
                <td>${description}</td>
            `;
            legendTable.appendChild(row);
        });
    }
    
    generateLegend();
  }
});
  