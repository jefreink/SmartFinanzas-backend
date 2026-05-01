const Trip = require('../models/Trip');
const Transaction = require('../models/Transaction');

// Create a new trip
exports.createTrip = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, budget, currency, participants, description, coverImage } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Trip name is required' });
    }

    // Asegurar que el creador esté en la lista de participantes
    const tripParticipants = participants || [];
    const creatorExists = tripParticipants.some(p =>
      p.userId === req.user.id || (p.userId && p.userId.toString() === req.user.id.toString())
    );

    if (!creatorExists) {
      tripParticipants.unshift({
        userId: req.user.id,
        name: req.user.name || 'Yo (Creador)',
        isMe: true
      });
    }

    const trip = await Trip.create({
      user: req.user.id,
      name,
      destination,
      startDate,
      endDate,
      budget,
      currency: currency || req.user.currency,
      status: 'active',
      participants: tripParticipants,
      description,
      coverImage
    });

    res.status(201).json({ success: true, trip: trip });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all trips for the user
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id })
      .sort({ startDate: -1 }) // Newest first
      .populate('participants.contactId', 'fullName avatar')
      .lean();

    // Calculate totals and expense counts for each trip
    for (const trip of trips) {
      const expenses = await Transaction.find({ trip: trip._id, type: 'expense' });
      trip.totalAmount = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
      trip.expenses = expenses; // Optional: sending all expenses might be heavy for list view, but frontend uses length
    }

    res.json({ success: true, trips: trips }); // Frontend expects { trips: [...] }
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single trip by ID
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.user.id })
      .populate('participants.contactId', 'fullName avatar relation')
      .populate('participants.userId', 'name email avatar')
      .lean();

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Get expenses
    const expenses = await Transaction.find({ trip: trip._id, type: 'expense' })
      .sort({ date: -1 })
      .populate('user', 'name') // Who created it
      .lean();

    console.log('📋 getTripById - Trip ID:', trip._id);
    console.log('📋 getTripById - Found expenses:', expenses.length);
    if (expenses.length > 0) {
      console.log('📋 First expense payer:', expenses[0].payer?.name);
      console.log('📋 First expense amount:', expenses[0].totalAmount);
      console.log('📋 First expense splitParticipants:', expenses[0].splitParticipants?.length);
    }

    // Map expenses to match frontend expectation (paidBy, splitBetween)
    // The transaction model naturally supports this via `splitParticipants` and `user`.
    // We might need to adjust formatting if frontend expects different structure.
    // Frontend expects: paidBy: { userId, name }, splitBetween: [...]

    trip.expenses = expenses.map(exp => ({
      _id: exp._id,
      description: exp.merchant || exp.description || '',
      amount: exp.totalAmount,
      currency: exp.currency,
      category: exp.category,
      date: exp.date,
      paidBy: { userId: exp.user._id, name: exp.user.name || 'Usuario' },
      splitBetween: exp.splitParticipants || [],
      isSplit: exp.isSplit,
      tip: exp.tip,
      items: exp.items || [],
      receiptImage: exp.receiptImage,
      metadata: exp.metadata
    }));

    trip.totalAmount = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

    res.json({ success: true, trip: trip });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a trip
exports.updateTrip = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, budget, status, participants, description, coverImage } = req.body;

    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        name,
        destination,
        startDate,
        endDate,
        budget,
        status,
        participants,
        description,
        coverImage
      },
      { new: true, runValidators: true }
    );

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a trip
exports.deleteTrip = async (req, res) => {
  try {
    const tripId = req.params.id;
    const trip = await Trip.findOneAndDelete({ _id: tripId, user: req.user.id });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Cascada: Eliminar todas las transacciones asociadas a este viaje
    const deletedTx = await Transaction.deleteMany({ trip: tripId });
    console.log(`[Trip Cascade] Eliminadas ${deletedTx.deletedCount} transacciones asociadas al viaje ${tripId}`);

    res.json({ success: true, message: 'Trip and associated expenses deleted' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add an expense to a trip
exports.addExpense = async (req, res) => {
  try {
    const { description, amount, currency, category, paidBy, splitBetween } = req.body;
    const tripId = req.params.id;

    await Transaction.create({
      user: req.user.id, // Creator
      trip: tripId,
      totalAmount: amount,
      subtotal: amount,
      type: 'expense',
      category: category || 'other',
      merchant: description,
      currency: currency || 'CLP',
      date: new Date(),
      payer: {
        userId: paidBy.userId,
        contactId: paidBy.contactId,
        name: paidBy.name
      },
      isSplit: true,
      splitParticipants: splitBetween.map(p => ({
        name: p.name,
        subtotal: p.amount,
        tipAmount: 0,
        total: p.amount,
        isMe: p.userId === req.user.id
      }))
    });

    return exports.getSettlement(req, res);

  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { description, amount, category, paidBy, splitBetween } = req.body;
    const { id, expenseId } = req.params;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: expenseId, trip: id },
      {
        totalAmount: amount,
        subtotal: amount,
        category,
        merchant: description,
        payer: {
          userId: paidBy.userId,
          name: paidBy.name
        },
        splitParticipants: splitBetween.map(p => ({
          name: p.name,
          subtotal: p.amount,
          tipAmount: 0,
          total: p.amount,
          isMe: p.userId === req.user.id
        }))
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    return exports.getSettlement(req, res);

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id, expenseId } = req.params;
    await Transaction.findOneAndDelete({ _id: expenseId, trip: id });
    return exports.getSettlement(req, res);
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get settlement
exports.getSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    // Get trip
    const trip = await Trip.findById(id)
      .populate('user', 'name email')
      .populate('participants.contactId', 'fullName avatar relation')
      .populate('participants.userId', 'name email avatar')
      .lean();

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Get expenses
    const expenses = await Transaction.find({ trip: trip._id, type: 'expense' })
      .sort({ date: -1 })
      .populate('user', 'name')
      .lean();

    // Map expenses
    trip.expenses = expenses.map(exp => ({
      _id: exp._id,
      description: exp.merchant || exp.description || '',
      amount: exp.totalAmount,
      currency: exp.currency,
      category: exp.category,
      date: exp.date,
      paidBy: { userId: exp.user._id, name: exp.user.name || 'Usuario' },
      splitBetween: exp.splitParticipants || [],
      isSplit: exp.isSplit,
      tip: exp.tip,
      items: exp.items || [],
      receiptImage: exp.receiptImage,
      metadata: exp.metadata
    }));

    trip.totalAmount = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

    // Calculate balances
    // Approach: For each expense, the payer advances money
    // Each person in splitParticipants owes their share
    const balances = {}; // name -> amount (positive = owed money, negative = owes money)

    console.log('🔍 Settlement Debug - Total expenses:', expenses.length);

    expenses.forEach((exp, idx) => {
      const payerName = (exp.payer?.name || 'Unknown').trim();
      const totalAmount = exp.totalAmount;

      console.log(`\n📝 Expense ${idx + 1}:`);
      console.log('  Payer:', payerName);
      console.log('  Total Amount:', totalAmount);
      console.log('  Split Participants:', exp.splitParticipants?.length || 0);

      // Initialize payer in balances if not exists
      if (!balances[payerName]) {
        balances[payerName] = 0;
      }

      if (exp.splitParticipants && exp.splitParticipants.length > 0) {
        // Distribute the cost among all split participants
        exp.splitParticipants.forEach(p => {
          const participantName = (p.name || 'Unknown').trim();
          const share = p.total || 0;

          console.log(`    - ${participantName}: ${share}`);

          // Initialize participant in balances if not exists
          if (!balances[participantName]) {
            balances[participantName] = 0;
          }

          // Participant owes their share (negative balance)
          balances[participantName] -= share;

          // Payer gets credit for the amount paid (but will be reduced by their own share if they're in the list)
          balances[payerName] += share;
        });
      } else {
        // If no split participants, payer pays the full amount
        balances[payerName] += totalAmount;
      }
    });

    console.log('\n💰 Final Balances:', balances);

    // Calculate settlements (who owes who)
    const settlements = [];
    const participants = Object.keys(balances);

    // Create a copy of balances for settlement calculation to avoid zeroing out the original balances
    const tempBalances = { ...balances };

    console.log('🔢 Participants for settlement:', participants);
    console.log('🔢 Balances values:', Object.values(balances));

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const p1 = participants[i];
        const p2 = participants[j];
        const balance1 = tempBalances[p1];
        const balance2 = tempBalances[p2];

        // If one is creditor and other is debtor, create settlement
        if (balance1 > 0.01 && balance2 < -0.01) {
          const amount = Math.min(balance1, Math.abs(balance2));
          settlements.push({
            from: p2,
            to: p1,
            amount: parseFloat(amount.toFixed(2))
          });
          tempBalances[p1] -= amount;
          tempBalances[p2] += amount;
        } else if (balance1 < -0.01 && balance2 > 0.01) {
          const amount = Math.min(Math.abs(balance1), balance2);
          settlements.push({
            from: p1,
            to: p2,
            amount: parseFloat(amount.toFixed(2))
          });
          tempBalances[p1] += amount;
          tempBalances[p2] -= amount;
        }
      }
    }

    res.json({ success: true, trip, balances, settlements });

  } catch (error) {
    console.error('Settlement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
