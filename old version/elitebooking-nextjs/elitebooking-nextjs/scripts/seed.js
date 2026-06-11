/**
 * EliteBooking — Script de données initiales
 * Usage : MONGODB_URI="..." node scripts/seed.js
 * 
 * Crée :
 *   - 2 comptes clients demo
 *   - 2 comptes pro demo avec salons + services + staff + schedule
 *   - 5 RDV de démonstration
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI manquant'); process.exit(1); }

async function seed() {
  await mongoose.connect(MONGODB_URI, { dbName: 'elitebooking' });
  console.log('✅ Connecté à MongoDB');

  // Clear collections
  const db = mongoose.connection.db;
  for (const col of ['users','salons','servicecategories','services','staffs','schedules','blocks','rdvs']) {
    try { await db.collection(col).deleteMany({}); } catch(e) {}
  }
  console.log('🗑  Collections vidées');

  const hash = await bcrypt.hash('demo123', 12);

  // Clients
  const c1 = await db.collection('users').insertOne({
    firstname:'Yasmine', lastname:'Alaoui', email:'client@demo.com',
    password:hash, type:'client', phone:'0612345678',
    createdAt:new Date(), updatedAt:new Date()
  });

  // Pro 1 — Beldi Spa
  const p1 = await db.collection('users').insertOne({
    firstname:'Nadia', lastname:'Tazi', email:'pro@demo.com',
    password:hash, type:'pro', plan:'pro',
    createdAt:new Date(), updatedAt:new Date()
  });

  const s1 = await db.collection('salons').insertOne({
    ownerId:p1.insertedId, name:'Beldi Spa & Hammam', category:'hammam',
    city:'Casablanca', address:'45 Bd Zerktouni', phone:'0522123456',
    rating:4.9, reviewCount:87, active:true, pin:'0000',
    description:'Hammam traditionnel marocain au cœur de Casablanca. Gommage, ghassoul, massages.',
    createdAt:new Date()
  });

  await db.collection('users').updateOne({_id:p1.insertedId},{$set:{salonId:s1.insertedId}});

  // Schedule s1
  const sched = { Lu:{open:true,start:'09:00',end:'20:00'}, Ma:{open:true,start:'09:00',end:'20:00'},
    Me:{open:true,start:'09:00',end:'20:00'}, Je:{open:true,start:'09:00',end:'20:00'},
    Ve:{open:true,start:'09:00',end:'21:00'}, Sa:{open:true,start:'09:00',end:'19:00'},
    Di:{open:false,start:'09:00',end:'18:00'} };
  await db.collection('schedules').insertOne({salonId:s1.insertedId,...sched});

  // Categories s1
  const cat1 = await db.collection('servicecategories').insertOne({salonId:s1.insertedId,name:'Hammam',color:'#8B4A2B',order:0});
  const cat2 = await db.collection('servicecategories').insertOne({salonId:s1.insertedId,name:'Massages',color:'#C17B4E',order:1});
  const cat3 = await db.collection('servicecategories').insertOne({salonId:s1.insertedId,name:'Soins visage',color:'#A0522D',order:2});

  // Services s1
  const sv1 = await db.collection('services').insertOne({salonId:s1.insertedId,catId:cat1.insertedId,name:'Hammam traditionnel',priceType:'fixed',price:200,duration:60,active:true,order:0,staffIds:[]});
  const sv2 = await db.collection('services').insertOne({salonId:s1.insertedId,catId:cat1.insertedId,name:'Gommage au savon beldi',priceType:'fixed',price:150,duration:45,active:true,order:1,staffIds:[]});
  const sv3 = await db.collection('services').insertOne({salonId:s1.insertedId,catId:cat2.insertedId,name:'Massage relaxant',priceType:'from',price:250,duration:60,active:true,order:0,staffIds:[]});
  const sv4 = await db.collection('services').insertOne({salonId:s1.insertedId,catId:cat3.insertedId,name:'Soin visage au ghassoul',priceType:'fixed',price:180,duration:50,active:true,order:0,staffIds:[]});
  const sv5 = await db.collection('services').insertOne({salonId:s1.insertedId,catId:cat2.insertedId,name:'Massage pierres chaudes',priceType:'quote',price:0,duration:90,active:true,order:1,staffIds:[]});

  // Staff s1
  const st1 = await db.collection('staffs').insertOne({salonId:s1.insertedId,firstname:'Aicha',lastname:'Benali',role:'Masseuse',days:['Lu','Ma','Me','Je','Ve'],start:'09:00',end:'19:00',active:true});
  const st2 = await db.collection('staffs').insertOne({salonId:s1.insertedId,firstname:'Fatima',lastname:'Idrissi',role:'Esthéticienne',days:['Lu','Ma','Je','Ve','Sa'],start:'10:00',end:'20:00',active:true});
  const st3 = await db.collection('staffs').insertOne({salonId:s1.insertedId,firstname:'Sofia',lastname:'Moussaoui',role:'Hammam',days:['Ma','Me','Je','Ve','Sa'],start:'09:00',end:'18:00',active:true});

  // Demo RDVs
  const today = new Date();
  const fmt = d => d.toISOString().slice(0,10);
  const t = n => { const d=new Date(today); d.setDate(d.getDate()+n); return fmt(d); };

  await db.collection('rdvs').insertMany([
    {clientId:c1.insertedId,clientName:'Yasmine Alaoui',salonId:s1.insertedId,salonName:'Beldi Spa & Hammam',
     serviceId:sv1.insertedId,serviceName:'Hammam traditionnel',staffId:st1.insertedId,staffName:'Aicha Benali',
     date:t(1),time:'10:00',duration:60,price:200,priceType:'fixed',status:'confirmed',source:'client',createdAt:new Date()},
    {clientId:c1.insertedId,clientName:'Yasmine Alaoui',salonId:s1.insertedId,salonName:'Beldi Spa & Hammam',
     serviceId:sv3.insertedId,serviceName:'Massage relaxant',staffId:st2.insertedId,staffName:'Fatima Idrissi',
     date:t(1),time:'11:30',duration:60,price:250,priceType:'from',status:'confirmed',source:'client',createdAt:new Date()},
    {clientId:'pro-add',clientName:'Mehdi Benhaddou',salonId:s1.insertedId,salonName:'Beldi Spa & Hammam',
     serviceId:sv2.insertedId,serviceName:'Gommage au savon beldi',staffId:st3.insertedId,staffName:'Sofia Moussaoui',
     date:t(0),time:'14:00',duration:45,price:150,priceType:'fixed',status:'confirmed',source:'pro',createdAt:new Date()},
    {clientId:'pro-add',clientName:'Sara El Fassi',salonId:s1.insertedId,salonName:'Beldi Spa & Hammam',
     serviceId:sv4.insertedId,serviceName:'Soin visage au ghassoul',staffId:st2.insertedId,staffName:'Fatima Idrissi',
     date:t(2),time:'15:00',duration:50,price:180,priceType:'fixed',status:'confirmed',source:'pro',createdAt:new Date()},
    {clientId:c1.insertedId,clientName:'Yasmine Alaoui',salonId:s1.insertedId,salonName:'Beldi Spa & Hammam',
     serviceId:sv1.insertedId,serviceName:'Hammam traditionnel',staffId:st1.insertedId,staffName:'Aicha Benali',
     date:fmt(new Date(today.getTime()-7*86400000)),time:'11:00',duration:60,price:200,priceType:'fixed',status:'completed',source:'client',createdAt:new Date()},
  ]);

  console.log('✅ Seed terminé !');
  console.log('');
  console.log('Comptes de test :');
  console.log('  Client : client@demo.com / demo123');
  console.log('  Pro    : pro@demo.com    / demo123  (PIN: 0000)');
  console.log('');
  console.log('Salon créé : Beldi Spa & Hammam — Casablanca');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
