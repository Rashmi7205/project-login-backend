import  express  from "express";
import cookieParser from "cookie-parser";
import cors from 'cors';
import userRoutes from './routes/user.routes.js';
import errorMiddleWare from './middleware/error.middleware.js';


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));

app.use(cors({
    origin:"http://localhost:5500",
    credentials:true,
}))
app.use('/api/v1/user',userRoutes);


app.all('*',(req,res)=>{
    return res.status(400).send('OOPS!! PAGE NOT FOUND');
})

app.use(errorMiddleWare);

export default app;