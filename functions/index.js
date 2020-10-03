const functions = require('firebase-functions');
const tools = require('firebase-tools');
const admin = require('firebase-admin');
const { database } = require('firebase-admin');
admin.initializeApp();  
const db = admin.firestore();
const messaging = admin.messaging();

exports.newPod = functions.firestore.
    document('groupsInfo/{groupName}/pods/{podId}')
    .onCreate(async (snap, context) => {
    const data = snap.data();
    const message = {
        notification:{
            title : "새로운 팟이 생성되었습니다!",
            body : data.podName + "팟에 참가해 보시는건 어떠신가요?"
        },
        topic : context.params.groupName
    }
    const response = await messaging.send(message);
    response.results.forEach((result) => {
        const error = result.error;
        if (error) {
          console.error('Failure sending notification to', context.params.groupName, error);
          return error;
        }
        else return result;
      });
});

exports.completePod = functions.firestore
    .document('groupsInfo/{groupName}/pods/{podId}')
    .onUpdate((change, context)=>{
        const data = change.after.data();
        if(data.podUsers.length == data.maxUsers){
            const message = {
                notification:{
                    title : data.podName + "팟이 결성되었습니다",
                    body : data.podName + "팟에 참가해 보시는건 어떠신가요?"
                },
                topic : context.params.groupName
            }
            const response = await messaging.send(message);
            response.results.forEach((result) => {
                const error = result.error;
                if (error) {
                  console.error('Failure sending notification to', context.params.groupName, error);
                  return error;
                }
                else return result;
              });
        }
    })

exports.deletePod = functions.firestore
    .document('groupsInfo/{groupName}/pods')
    .onUpdate((change, context)=>{
        const snapshots = await db.collection(context.groupName)
        .where('timestamp', '<', Date.now())
        .get();
        snapshots.forEach(snapshot =>{    
            if (snapshot.empty) {
                console.log('No matching documents.');
                return;
            }
            tools.firestore.delete({
                project: process.env.GCLOUD_PROJECT,
                recursive: true,
                yes: true,
                token: functions.config().fb_token
            }, snapshot.ref.path);
        });
        return;
    });