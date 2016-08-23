<?php
	require('values.php');
	require('connect1.php');
	
	$query = "select count(p.game) players, map from fwGames g join fwPlayers p on g.row=p.game and g.name=? group by p.game having players > 0";
	$name ="Test";
	$stmt = $link->prepare($query);
	$stmt->bind_param('s', $name);
	$stmt->execute();
	// $stmt->store_result();
	// $count = $stmt->num_rows;
	// $arr = $stmt->fetch();
	$stmt->bind_result($count);
	while($stmt->fetch()){
		$count = $players;
	}
	
	$stmt->bind_result($players);
	while($stmt->fetch()){
		$count = $players;
	};
	var_dump($count);

	//var_dump($arr);
	exit();
	
	
	$_SESSION['production'] = 99999;
	$_SESSION['tech'] = new stdClass();
	$_SESSION['tech']->engineering = 0;
	$_SESSION['tech']->gunpowder = 0;
	$_SESSION['tech']->rocketry = 0;
	$_SESSION['tech']->atomicTheory = 0;
	$_SESSION['missilesLaunched'] = 0;
	
	$gameDuration = microtime(true) - $_SESSION['gameDuration'];
	echo 'gameDuration: ' . $gameDuration . '<br>';
	$gameStartTime = 6 + ($_SESSION['resourceTick'] * 5);
	echo 'gameStartTime: ' . $gameStartTime . '<br>';
	
	$gameNow = (6 + $_SESSION['resourceTick'] * 5);
	echo 'gameNow: ' . $gameNow . '<br>';
	$gameStartTime = microtime(true) - $_SESSION['gameStartTime'];
	echo 'gameStartTime: ' . $gameStartTime . '<br>';
	
	if (isset($_SESSION['resourceTick'])){
		echo 'Resource Tick: ' . $_SESSION['resourceTick'] . '<br>';
		
		$gameDuration = microtime(true) - $_SESSION['gameStartTime'] + .5;
		echo 'gameDuration: ' . $gameDuration . '<br>';
		$tickDuration = $_SESSION['resourceTick'] * 5;
		echo 'tickDuration: ' . $tickDuration . '<br>';
	}
	
	// echo session
	if (isset($_SESSION['email'])){
		echo "email: " . $_SESSION['email'];
		echo "<br>account: " . $_SESSION['account'];
	}
	if (isset($_SESSION['max'])){
		echo "<br>gameId: " . $_SESSION['gameId'];
		echo "<br>max: " . $_SESSION['max'];
		echo "<br>gameName: " . $_SESSION['gameName'];
		echo "<br>gameStarted: " . $_SESSION['gameStarted'];
		echo "<br>gameType: " . $_SESSION['gameType'];
		echo "<br>player: " . $_SESSION['player'];
		echo "<br>map: " . $_SESSION['map'];
		echo "<br>food: " . $_SESSION['food'];
		echo "<br>foodMax: " . $_SESSION['foodMax'];
		echo "<br>foodMilestone: " . $_SESSION['foodMilestone'];
		echo "<br>production: " . $_SESSION['production'];
		echo "<br>culture: " . $_SESSION['culture'];
		echo "<br>cultureMax: " . $_SESSION['cultureMax'];
		echo "<br>cultureMilestone: " . $_SESSION['cultureMilestone'];
		echo "<br>manpower: " . $_SESSION['manpower'];
		if (isset($_SESSION['capital'])){
			echo "<br>capital: " . $_SESSION['capital'];
		}
		echo "<br>chatId: " . $_SESSION['chatId'];
		echo "<br>resourceTick: " . $_SESSION['resourceTick'];
		
		echo "<br>turnBonus: " . $_SESSION['turnBonus'];
		echo "<br>foodBonus: " . $_SESSION['foodBonus'];
		echo "<br>cultureBonus: " . $_SESSION['cultureBonus'];
		echo "<br>oBonus: " . $_SESSION['oBonus'];
		echo "<br>dBonus: " . $_SESSION['dBonus'];
	} else {
		echo '<br>Game values not detected in session.';
	}
	echo "<hr>";
	
	$start = microtime(true);
	
?>