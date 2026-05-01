const FamilyGroup = require('../models/FamilyGroup');
const User = require('../models/User');

const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

exports.createGroup = async (req, res) => {
    try {
        const { name } = req.body;

        // Verificar si ya pertenece a un grupo (opcional, MVP permite 1 grupo)
        const existing = await FamilyGroup.findOne({ 'members.user': req.user.id });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Ya perteneces a un grupo familiar' });
        }

        let code = generateCode();
        // Verificar unicidad del codigo (simple check)
        while (await FamilyGroup.findOne({ code })) {
            code = generateCode();
        }

        const group = await FamilyGroup.create({
            name,
            code,
            creator: req.user.id,
            members: [{ user: req.user.id, role: 'admin' }]
        });

        res.status(201).json({ success: true, data: group });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.joinGroup = async (req, res) => {
    try {
        const { code } = req.body;

        const group = await FamilyGroup.findOne({ code });
        if (!group) {
            return res.status(404).json({ success: false, message: 'Grupo no encontrado o código inválido' });
        }

        const isMember = group.members.some(m => m.user.toString() === req.user.id);
        if (isMember) {
            return res.status(400).json({ success: false, message: 'Ya eres miembro de este grupo' });
        }

        // Verificar si ya está en otro grupo
        const existing = await FamilyGroup.findOne({ 'members.user': req.user.id });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Ya perteneces a un grupo familiar. Sal primero.' });
        }

        group.members.push({ user: req.user.id, role: 'member' });
        await group.save();

        res.json({ success: true, data: group });
    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyGroup = async (req, res) => {
    try {
        const group = await FamilyGroup.findOne({ 'members.user': req.user.id })
            .populate('members.user', 'name email profileImage');

        if (!group) {
            return res.status(404).json({ success: false, message: 'No perteneces a ningún grupo' });
        }

        res.json({ success: true, data: group });
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.leaveGroup = async (req, res) => {
    try {
        const group = await FamilyGroup.findOne({ 'members.user': req.user.id });
        if (!group) {
            return res.status(404).json({ success: false, message: 'No estás en un grupo' });
        }

        // Remover usuario
        group.members = group.members.filter(m => m.user.toString() !== req.user.id);

        if (group.members.length === 0) {
            // Eliminar grupo si queda vacío
            await FamilyGroup.findByIdAndDelete(group._id);
            return res.json({ success: true, message: 'Grupo eliminado por falta de miembros' });
        } else {
            // Si el admin se va, asignar nuevo admin (opcional, MVP simple: primer miembro)
            if (group.creator.toString() === req.user.id) {
                group.creator = group.members[0].user;
                group.members[0].role = 'admin';
            }
            await group.save();
        }

        res.json({ success: true, message: 'Has salido del grupo' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
