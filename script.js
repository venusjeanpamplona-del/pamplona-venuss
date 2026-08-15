import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================
   FIREBASE
========================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyD69UthfpO3blXr-bkYJ4f-vK9CiZDSsR8",

    authDomain:
        "venusjean-253b5.firebaseapp.com",

    databaseURL:
        "https://venusjean-253b5-default-rtdb.europe-west1.firebasedatabase.app",

    projectId:
        "venusjean-253b5",

    storageBucket:
        "venusjean-253b5.firebasestorage.app",

    messagingSenderId:
        "363163389168",

    appId:
        "1:363163389168:web:25db157498b3a917e5c635",

    measurementId:
        "G-6YSNGE4KBQ"
};


const app =
    initializeApp(firebaseConfig);


const db =
    getDatabase(app);


/* =========================================
   REFERENCES
========================================= */

const controlRef =
    ref(db, "collectionControl");


const rootRef =
    ref(db);


/* =========================================
   ELEMENTS
========================================= */

const intervalInput =
    document.getElementById(
        "intervalInput"
    );


const setBtn =
    document.getElementById(
        "setBtn"
    );


const currentInterval =
    document.getElementById(
        "currentInterval"
    );


const countdown =
    document.getElementById(
        "countdown"
    );


const message =
    document.getElementById(
        "message"
    );


const records =
    document.getElementById(
        "records"
    );


const recordCount =
    document.getElementById(
        "recordCount"
    );


/* =========================================
   VARIABLES
========================================= */

let running = false;

let selectedInterval = 0;

let secondsLeft = 0;

let countdownTimer = null;


/* =========================================
   START COLLECTION
========================================= */

setBtn.addEventListener(
    "click",
    async () => {

        const seconds =
            Number(
                intervalInput.value
            );


        if (
            !Number.isInteger(seconds) ||
            seconds <= 0
        ) {

            message.textContent =
                "Enter a valid number of seconds.";

            return;

        }


        setBtn.disabled = true;

        intervalInput.disabled = true;


        try {

            /*
             * START ESP32
             */

            await set(
                controlRef,
                {

                    active: true,

                    interval: seconds,

                    heartbeat:
                        Date.now(),

                    timestamp:
                        Date.now()

                }
            );


            /*
             * Browser state
             */

            running = true;

            selectedInterval =
                seconds;

            secondsLeft =
                seconds;


            currentInterval.textContent =
                seconds + " sec";


            countdown.textContent =
                secondsLeft + " sec";


            message.textContent =
                "Collection is active.";


            startCountdown();


        }

        catch (error) {

            console.error(
                "SET ERROR:",
                error
            );


            message.textContent =
                "Unable to start collection.";


            setBtn.disabled = false;

            intervalInput.disabled = false;

        }

    }
);


/* =========================================
   COUNTDOWN
========================================= */

function startCountdown() {

    clearInterval(
        countdownTimer
    );


    countdownTimer =
        setInterval(
            () => {

                if (!running) {

                    clearInterval(
                        countdownTimer
                    );

                    return;

                }


                secondsLeft--;


                if (
                    secondsLeft <= 0
                ) {

                    secondsLeft =
                        selectedInterval;

                }


                countdown.textContent =
                    secondsLeft + " sec";


            },
            1000
        );

}


/* =========================================
   HEARTBEAT
========================================= */

/*
 * Habang bukas ang website,
 * nirerefresh natin ang heartbeat.
 *
 * Kapag isinara ang website,
 * titigil ang heartbeat.
 */

setInterval(
    async () => {

        if (!running) {
            return;
        }


        try {

            await set(
                controlRef,
                {

                    active: true,

                    interval:
                        selectedInterval,

                    heartbeat:
                        Date.now(),

                    timestamp:
                        Date.now()

                }
            );

        }

        catch (error) {

            console.error(
                "HEARTBEAT ERROR:",
                error
            );

        }

    },
    2000
);


/* =========================================
   FIREBASE DISCONNECT
========================================= */

/*
 * Kapag nawala ang browser connection,
 * Firebase sets active = false.
 */

onDisconnect(
    controlRef
)
.set({

    active: false,

    interval: 0,

    heartbeat: 0,

    timestamp: Date.now()

})
.catch(
    error => {

        console.error(
            "Disconnect setup error:",
            error
        );

    }
);


/* =========================================
   READ SENSOR DATA
========================================= */

onValue(

    rootRef,

    snapshot => {

        const data =
            snapshot.val();


        records.innerHTML =
            "";


        if (!data) {

            recordCount.textContent =
                "0";


            records.innerHTML = `
                <div class="empty">
                    No observations recorded.
                </div>
            `;

            return;

        }


        const rows = [];


        /*
         * IMPORTANT:
         *
         * TANGING ROOT NODES NA BABASAHIN:
         *
         * YYYY-MM-DD
         */

        Object.entries(
            data
        ).forEach(
            ([date, dateData]) => {


                if (
                    !/^\d{4}-\d{2}-\d{2}$/
                        .test(date)
                ) {

                    return;

                }


                if (
                    !dateData ||
                    typeof dateData !== "object"
                ) {

                    return;

                }


                Object.entries(
                    dateData
                ).forEach(
                    ([time, value]) => {


                        if (
                            !value ||
                            typeof value !== "object"
                        ) {

                            return;

                        }


                        if (
                            value.float === undefined &&
                            value.int === undefined
                        ) {

                            return;

                        }


                        rows.push({

                            date: date,

                            time: time,

                            float:
                                value.float ?? "-",

                            int:
                                value.int ?? "-"

                        });

                    }
                );

            }
        );


        recordCount.textContent =
            rows.length;


        /*
         * DESCENDING
         *
         * Latest first
         */

        rows.sort(
            (a, b) => {

                const first =
                    a.date + " " + a.time;

                const second =
                    b.date + " " + b.time;


                return second.localeCompare(
                    first
                );

            }
        );


        if (
            rows.length === 0
        ) {

            records.innerHTML = `
                <div class="empty">
                    No observations recorded.
                </div>
            `;

            return;

        }


        /*
         * DISPLAY
         */

        rows.forEach(
            item => {


                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "record";


                row.innerHTML = `

                    <div class="date">
                        ${safe(item.date)}
                    </div>

                    <div class="time">
                        ${safe(item.time)}
                    </div>

                    <div class="value-data">
                        ${safe(
                            String(item.float)
                        )}
                    </div>

                    <div class="value-data">
                        ${safe(
                            String(item.int)
                        )}
                    </div>

                `;


                records.appendChild(
                    row
                );

            }
        );

    },


    error => {

        console.error(
            "DATABASE ERROR:",
            error
        );


        records.innerHTML = `
            <div class="empty">
                Database access denied.
            </div>
        `;

    }

);


/* =========================================
   SAFE HTML
========================================= */

function safe(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   PAGE CLOSE
========================================= */

window.addEventListener(
    "pagehide",
    () => {

        /*
         * Browser will normally let
         * Firebase onDisconnect handle this.
         *
         * We also try to send STOP.
         */

        if (running) {

            set(
                controlRef,
                {

                    active: false,

                    interval: 0,

                    heartbeat: 0,

                    timestamp:
                        Date.now()

                }
            ).catch(
                () => {}
            );

        }

    }
);


/* =========================================
   READY
========================================= */

console.log(
    "VENUS LAB 01 READY"
);