var firebaseConfig = {
    apiKey: "AIzaSyBq1wb-WlCSMH8cYeKvSWQlssMIk6z7b7Y",
    authDomain: "stat-web-6372a.firebaseapp.com",
    projectId: "stat-web-6372a",
    storageBucket: "stat-web-6372a.appspot.com",
    messagingSenderId: "1093597820985",
    appId: "1:1093597820985:web:ebd29201a74fea5acf35e8",
    measurementId: "G-ZWTBZRCXXE"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

const db = firebase.firestore();