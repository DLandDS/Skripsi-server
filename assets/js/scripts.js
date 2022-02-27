(function ($) {
  "use strict";

  /*================================
    Preloader
    ==================================*/

  var preloader = $("#preloader");
  $(window).on("load", function () {
    setTimeout(function () {
      preloader.fadeOut("slow", function () {
        $(this).remove();
      });
    }, 300);
  });

  /*================================
    stickey Header
    ==================================*/
  $(window).on("scroll", function () {
    var scroll = $(window).scrollTop(),
      mainHeader = $("#sticky-header"),
      mainHeaderHeight = mainHeader.innerHeight();

    // console.log(mainHeader.innerHeight());
    if (scroll > 1) {
      $("#sticky-header").addClass("sticky-menu");
    } else {
      $("#sticky-header").removeClass("sticky-menu");
    }
  });

  /*================================
    Slicknav mobile menu
    ==================================*/
  $("ul#nav_menu").slicknav({
    prependTo: "#mobile_menu",
  });

  /*================================
    Fullscreen Page
    ==================================*/

  if ($("#full-view").length) {
    var requestFullscreen = function (ele) {
      if (ele.requestFullscreen) {
        ele.requestFullscreen();
      } else if (ele.webkitRequestFullscreen) {
        ele.webkitRequestFullscreen();
      } else if (ele.mozRequestFullScreen) {
        ele.mozRequestFullScreen();
      } else if (ele.msRequestFullscreen) {
        ele.msRequestFullscreen();
      } else {
        console.log("Fullscreen API is not supported.");
      }
    };

    var exitFullscreen = function () {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else {
        console.log("Fullscreen API is not supported.");
      }
    };

    var fsDocButton = document.getElementById("full-view");
    var fsExitDocButton = document.getElementById("full-view-exit");

    fsDocButton.addEventListener("click", function (e) {
      e.preventDefault();
      requestFullscreen(document.documentElement);
      $("body").addClass("expanded");
    });

    fsExitDocButton.addEventListener("click", function (e) {
      e.preventDefault();
      exitFullscreen();
      $("body").removeClass("expanded");
    });
  }
})(jQuery);

//////////////////// Program Saya /////////////////////////

async function getTimelineData() {
  let dataProvider = [];
  let response = await fetch("/api?get=timeline&limit=120");
  let data = await response.json();

  for (let index = data.length - 1; index > 0; index--) {
    const element = data[index];
    let date = new Date(element.timeline + ":00.000");
    date.setHours(date.getHours() + 14);
    let timeline = date.toISOString().split(".")[0].split(":");
    timeline = `${timeline[0]}:${timeline[1]}`;
    dataProvider.push({
      date: timeline.split("T")[1],
      value: element.value,
    });
  }
  return dataProvider;
}

let timeline = AmCharts.makeChart("user-statistics", {
  type: "serial",
  theme: "light",
  marginRight: 0,
  marginLeft: 50,
  autoMarginOffset: 20,
  dataDateFormat: "HH:mm",
  valueAxes: [
    {
      id: "v1",
      axisAlpha: 0,
      position: "left",
      ignoreAxisWidth: true,
    },
  ],
  balloon: {
    borderThickness: 1,
    shadowAlpha: 0,
  },
  graphs: [
    {
      id: "g1",
      balloon: {
        drop: true,
        adjustBorderColor: false,
        color: "#ffffff",
        type: "smoothedLine",
      },
      fillAlphas: 0.2,
      bullet: "round",
      bulletBorderAlpha: 1,
      bulletColor: "#FFFFFF",
      bulletSize: 5,
      hideBulletsCount: 50,
      lineThickness: 2,
      title: "red line",
      useLineColorForBulletBorder: true,
      valueField: "value",
      balloonText: "<span style='font-size:18px;'>[[value]]</span>",
    },
  ],
  chartCursor: {
    valueLineEnabled: true,
    valueLineBalloonEnabled: true,
    cursorAlpha: 0,
    zoomable: false,
    valueZoomable: true,
    valueLineAlpha: 0.5,
  },
  valueScrollbar: {
    autoGridCount: true,
    color: "#5E72F3",
    scrollbarHeight: 30,
  },
  categoryField: "date",
  categoryAxis: {
    parseDates: false,
    dashLength: 1,
    minorGridEnabled: true,
  },
  export: {
    enabled: false,
  },
  dataProvider: [
    {
      date: "13:00",
      value: 200,
    },
  ],
});

function timelineUpdate() {
  let data = getTimelineData();
  data.then((res) => {
    timeline.dataProvider = res;
    timeline.validateData();
  });
}

timelineUpdate();
setInterval(() => {
  timelineUpdate();
}, 60000);

let labels = [];
let data = [];

for (let index = 60; index > 0; index--) {
  labels.push(`${index} second`);
  data.push(0);
}

const ctx = document.getElementById("seolinechart1").getContext("2d");
const chart = new Chart(ctx, {
  // The type of chart we want to create
  type: "line",
  // The data for our dataset
  data: {
    labels: labels,
    datasets: [
      {
        label: "PPM",
        backgroundColor: "rgba(104, 124, 247, 0.6)",
        borderColor: "#8596fe",
        data: data,
      },
    ],
  },
  // Configuration options go here
  options: {
    legend: {
      display: false,
    },
    animation: {
      easing: "easeInOutBack",
    },
    scales: {
      yAxes: [
        {
          display: !1,
          ticks: {
            fontColor: "rgba(0,0,0,0.5)",
            fontStyle: "bold",
            beginAtZero: !0,
            maxTicksLimit: 5,
            padding: 0,
          },
          gridLines: {
            drawTicks: !1,
            display: !1,
          },
        },
      ],
      xAxes: [
        {
          display: !1,
          gridLines: {
            zeroLineColor: "transparent",
          },
          ticks: {
            padding: 0,
            fontColor: "rgba(0,0,0,0.5)",
            fontStyle: "bold",
          },
        },
      ],
    },
    elements: {
      line: {
        tension: 0, // disables bezier curves
      },
    },
  },
});

const container = document.getElementById("data-container");
const sensor = document.getElementById("sensor-container");
const statusSensor = document.getElementById("sensor-description");

let time = 0;

let modalError = `<!-- The Modal -->
<div class="modal fade" id="connection-error">
  <div class="modal-dialog">
    <div class="modal-content">
      
      <!-- Modal body -->
      <div class="modal-body">
      <h4>Connection is lost.</h4>
      </div>
      
      <!-- Modal footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" data-dismiss="modal" onClick="window.location.reload();">Reload</button>
      </div>
      
    </div>
  </div>
</div>`;

let updateData = setInterval(() => {
  const Url = "/api?get=now";
  let lenght = container.children.length;
  let data = fetch(Url)
    .then((data) => {
      if (data.status != 200) {
        window.location.reload();
        return;
      }
      return data.json();
    })
    .then((res) => {
      let now = new Date(res.time);
      now.setHours(now.getHours() + 7);
      if (now.getSeconds() == time) {
        time = now.getSeconds();
        return;
      }
      if (lenght == 60) {
        container.removeChild(
          container.childNodes[container.children.length - 1]
        );
      }
      let alertType;
      let value = Number(res.value);
      let colorchart = document.getElementById("colorful-chart");
      if (value <= 50) {
        alertType = "alert-primary";
        colorchart.className = "seo-fact sbg1";
        statusSensor.innerHTML = "Bagus";
      } else if (value > 50 && value <= 100) {
        alertType = "alert-primary";
        colorchart.className = "seo-fact sbg1";
        statusSensor.innerHTML = "Sedang";
      } else if (value > 100 && value <= 150) {
        alertType = "alert-info";
        colorchart.className = "seo-fact sbg2";
        statusSensor.innerHTML = "Kurang Sehat";
      } else if (value > 150 && value <= 200) {
        alertType = "alert-warning";
        statusSensor.innerHTML = "Tidak Sehat";
        colorchart.className = "seo-fact sbg4";
      } else if (value > 200 && value <= 300) {
        alertType = "alert-warning";
        statusSensor.innerHTML = "Sangat tidak sehat";
        colorchart.className = "seo-fact sbg4";
      } else if (value > 300) {
        alertType = "alert-danger";
        colorchart.className = "seo-fact sbg3";
        statusSensor.innerHTML = "Berbahaya";
      }
      let content = `<div class="alert ${alertType}" role="alert"><a style="float:left">${
        now.toISOString().split("T")[1].split(".")[0]
      }</a> <a style="float:right">${res.value}</a></div>`;
      let innerHTML = (content += container.innerHTML);
      sensor.innerHTML = res.value;
      container.innerHTML = innerHTML;
      time = now.getSeconds();
      chart.data.datasets[0].data.shift();
      chart.data.datasets[0].data.push(value);
      chart.update();
    })
    .catch((error) => {
      document.body.innerHTML += modalError;
      $("#connection-error").modal();
      clearInterval(updateData);
    });
}, 1000);
