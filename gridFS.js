const express=require('express')
const multer=require('multer')
const fs=require('fs')
const html=fs.readFileSync('./gridFS_uploadhtml.html');
const html2=fs.readFileSync('./gridFS_streamhtml.html');
const cloudinary=require('cloudinary').v2;
const { default: mongoose } = require('mongoose');
const URI="mongodb+srv://dixit:studyonly@cluster0.zsdhrt0.mongodb.net/StudentsInfo?retryWrites=true&w=majority";
const Grid=require('gridfs-stream')
const mongodb=require('mongodb')
const morgan=require('morgan');


mongoose.connect(URI,{
    useNewUrlParser:true
}).then((conn)=>{
    console.log("Database Connected Successfully")
})

var connection=mongoose.connection;


const app=express();

app.listen(8000,(err)=>{
    console.log('server is listening...')
})

//1.create storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now()+'_';
      console.log(file);
      if(file.mimetype.startsWith('image')){
      cb(null, file.fieldname +uniqueSuffix+'.jpg')
      }
      if(file.mimetype.startsWith('video')){
        cb(null, file.fieldname +uniqueSuffix+'.mp4')
        }
      
    }
  })
//2.create filter
// const filter=function fileFilter (req, file, cb) {

//   if(file.mimetype.startsWith("image")){
//     cb(null, true)
//   }else{  
//   cb(new Error('I don\'t have a clue!'), false)
//   }
// }


//3.create upload
const upload = multer({
   storage:storage,
  //fileFilter:filter
})

var gridfsbucket;

//gridFS bucket part:
connection.once('open',()=>{
    console.log('connection open');

     gridfsbucket=new mongoose.mongo.GridFSBucket(mongoose.connection.db,{
        chunkSizeBytes:1000000,
        bucketName:'myVideos'
    })
    
})



finalStage=(req,res)=>{
   // console.log(gridfsbucket)
    
    fs.createReadStream(req.file.path).pipe(gridfsbucket.openUploadStream('my vid2'))

    .on('error',(err)=>{
    console.log(err)})

    .on('finish',()=>{
    console.log('done uploading');
    return res.json({
        message:'done uploading'
    })
})
}


const streamVideo=async (req,res)=>{
  const range=req.headers.range;
 // console.log(req);
  const name="my vid2";
  if(!range){
    return res.status(400).json({
      message:'requires range in headers'
    })
  }

  //console.log(range)

  const db= mongoose.connection.db;

  const video=await db.collection('myVideos.files').findOne({filename:name})
 // console.log(video)

//   const video={
    
// length:14498869,
// chunkSize:1000000,
// filename:"uploads\videos1705812828645_.mp4"
//   }
  if(!video){
    return res.status(404).json({
      message:'No video found'
    })
  }

  console.log(video)
   //response headers
   videoSize=video.length;
 //  console.log(range);
 const start=Number(range.replace(/\D/g,""));
  
  
   const end=video.length-1;

   console.log(end);
   
   const contentLength=end-start+1;
  //  console.log('start :'+start);
  //  console.log('end :'+end)
  //  console.log('contentLength :'+contentLength);
  //  console.log('videoSize :'+contentLength);
 //  console.log(start,end)
   const headers={
     "Content-Range":`bytes ${start}-${end}/${videoSize}`,
     "Accept-Ranges":"bytes",
     "Content-Length":contentLength,
     "Content-Type":"video/mp4",
     
   }
   res.writeHead(206,headers);

  

   
   const downloadStream=gridfsbucket.openDownloadStreamByName("my vid2",{
    start,end
   })

  
  //  downloadStream.on('data',(chunks)=>{
  //   res.write(chunks);
  //  });

  //  downloadStream.on('end',()=>{
  //   res.end();
  //  });
    return downloadStream.pipe(res);
}



//4.use upload as middleware
app.post('/videoUpload',upload.single('videos'),finalStage);

// multerController=(req,res)=>{
//     console.log(req.file,req.body)
// }

app.get('/streamVideo',(req,res)=>{
res.end(html2)
})

app.get('/',(req,res)=>{
res.end(html)
})

app.get('/video',streamVideo);




