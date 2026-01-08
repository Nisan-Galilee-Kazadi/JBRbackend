const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Post = require('./models/Post');
const News = require('./models/News');
const Partner = require('./models/Partner');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://galileokazadi45:<db_password>@alsquaredb.lf956c0.mongodb.net/JBR?retryWrites=true&w=majority';

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await Post.deleteMany({});
        await News.deleteMany({});
        await Partner.deleteMany({});

        console.log('Cleared existing data.');

        // Seed Posts
        const posts = [
            {
                title: "Entraînement Matinal",
                caption: "Nos jeunes talents travaillent dur dès l'aube pour atteindre leurs rêves.",
                imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800",
                type: "blog",
                reactions: { likes: 124, hearts: 45 },
                comments: [
                    { user: "Coach Marc", text: "Magnifique séance aujourd'hui !" },
                    { user: "Parent Fier", text: "Allez Jeune Ballon Rêves !" }
                ]
            },
            {
                title: "Match Amical JBR",
                caption: "Une victoire serrée mais méritée. Bravo à l'équipe !",
                imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=800",
                type: "blog",
                reactions: { likes: 210, hearts: 89 },
                comments: []
            },
            {
                title: "Atelier Lecture",
                caption: "Parce que le ballon n'est pas tout, la lecture nourrit l'esprit.",
                imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800",
                type: "blog",
                reactions: { likes: 85, hearts: 32 },
                comments: []
            }
        ];

        // Seed News
        const news = [
            {
                title: "Nouvelle Académie à Kinshasa",
                content: "Nous sommes fiers d'annoncer l'ouverture de notre nouveau centre d'entraînement à Kinshasa pour accueillir plus de jeunes.",
                category: "Infrastructure",
                imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=800"
            },
            {
                title: "Partenariat avec la FECOFA",
                content: "Une étape historique pour JBR : un partenariat stratégique pour le développement du football junior.",
                category: "Officiel",
                imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d445eb951d?auto=format&fit=crop&q=80&w=800"
            }
        ];

        // Seed Partners
        const partners = [
            {
                name: "Orange RDC",
                logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/1024px-Orange_logo.svg.png",
                type: "Sponsor",
                website: "https://www.orange.cd"
            },
            {
                name: "Airtel RDC",
                logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Airtel_logo.svg/1200px-Airtel_logo.svg.png",
                type: "Sponsor",
                website: "https://www.airtel.cd"
            },
            {
                name: "UNICEF",
                logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/UNICEF_logo.svg/2560px-UNICEF_logo.svg.png",
                type: "Collaborateur",
                website: "https://www.unicef.org"
            }
        ];

        await Post.insertMany(posts);
        await News.insertMany(news);
        await Partner.insertMany(partners);

        console.log('Database seeded successfully!');
        process.exit();
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedData();
