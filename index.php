<?php
session_start();
include('server_script/config.php');
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASTU NEWS</title>
    <link rel="stylesheet" href="style/style2.css">
    <link rel="stylesheet" href="style/style.css">
    <link rel="stylesheet" href="fontawesome-free-5.15.4-web/css/all.min.css">
    <link rel="stylesheet" href="fontawesome-free-5.15.4-web/css/fontawesome.min.css">
    <style>
        .td-container {
            position: absolute;
            bottom: 0px;
            width: 100%;
            background-color:
                rgba(37, 33, 32, 0.479);
            padding: 0px 20px;
            font-size: 150%;
        }

        .ptitle {
            color: #ffffff;
            font-weight: bold;
        }

        .td-container p {
            color: white;
        }

        .container {
            display: flex;
            background-color: blueviolet;
        }

        .news-content>div:hover,
        .older-posts-container>div:hover {
            border: 2px solid orange;
        }
    </style>
</head>

<body>
    <div>
        <div class="container">
            <img src="ASTU-300x200.gif" width="100" height="65" /> <span style="margin-top: 25px; color: greenyellow; ">ASTU NEWS</span>
        </div>
    </div>
    <?php
    $query = mysqli_query($con, "select * from tblposts order by PostingDate desc");
    $rowcount = mysqli_num_rows($query);
    if ($rowcount > 0) {     ?>
        <h1 style="margin: 20px 0px 0px 50px;">here is top latest news for you</h1>

        <div class="news-content">
            <?php
            if ($row = mysqli_fetch_array($query)) {
            ?>
                <div class="current-news">

                    <a href="news_display.php?pid=<?php echo htmlentities($row['id']); ?>" style="height: 100%;">
                        <img src=" file_storage/<?php echo $row['PostImage'] ?>" alt="" style="width: 100%; max-height: 515px; ">
                        <div class="td-container">
                            <p class="ptitle"><?php echo $row['PostTitle'] ?> </p>
                            <p style="font-size: small;"><?php echo $row['PostingDate'] ?></p>

                        </div>
                        <div>

                        </div>


                    </a>
                </div>

            <?php } ?>
                <?php
                if ($row = mysqli_fetch_array($query)) {
                ?>
            <div class="yesterday-news">

                    <a href="news_display.php?pid=<?php echo htmlentities($row['id']); ?>" style="height: 250px; margin-top: 20px;">
                        <div class="older-news">
                            <div class="im-con">
                                <img src="file_storage/<?php echo $row['PostImage'] ?>" alt="" style="width: 100%; height: 250px; ">

                            </div>
                            <div class="td-container">
                                <p class="ptitle"><?php echo $row['PostTitle'] ?> </p>
                                <p style="font-size: small;"><?php echo $row['PostingDate'] ?></p>

                            </div>
                        </div>


                    </a>
                    </div>

                <?php } ?>
                <?php
                if ($row = mysqli_fetch_array($query)) {
                ?>
            <div class="older-news">

                    <a href="news_display.php?pid=<?php echo htmlentities($row['id']); ?>" style="height: 250px; margin-top: 20px;">
                        <div class="older-news">
                            <div class="im-con">
                                <img src="file_storage/<?php echo $row['PostImage'] ?>" alt="" style="width: 100%; height: 250px; ">

                            </div>
                            <div class="td-container">
                                <p class="ptitle"><?php echo $row['PostTitle'] ?> </p>
                                <p style="font-size: small;"><?php echo $row['PostingDate'] ?></p>

                            </div>
                        </div>


                    </a>
                    </div>

                <?php } ?>
                <?php
                if ($row = mysqli_fetch_array($query)) {
                ?>
            <div class="older-news1">

                    <a href="news_display.php?pid=<?php echo htmlentities($row['id']); ?>" style="height: 250px; margin-top: 20px;">
                        <div class="older-news">
                            <div class="im-con">
                                <img src="file_storage/<?php echo $row['PostImage'] ?>" alt="" style="width: 100%; height: 250px; ">

                            </div>
                            <div class="td-container">
                                <p class="ptitle"><?php echo $row['PostTitle'] ?> </p>
                                <p style="font-size: small;"><?php echo $row['PostingDate'] ?></p>

                            </div>
                        </div>


                    </a>
                    </div>


                <?php } ?>

        </div>
    <?php
    }
    ?>
    <h2 style="margin-left: 60px; padding: 10px;">older news</h2>

    <div class="wholder-posts">

        <div class="older-posts-container">

            <?php


            while ($row = mysqli_fetch_array($query)) { ?>
                <div>
                    <a href="news_display.php?pid=<?php echo htmlentities($row['id']); ?>">

                        <div class="img-conn">
                            <img src="file_storage/<?php echo $row['PostImage'] ?>" alt="" style="width: 100%; height: 300px; ">
                        </div>
                        <div class="td-container">
                            <p class="ptitle"><?php echo $row['PostTitle'] ?> </p>
                            <p style="font-size: small;"><?php echo $row['PostingDate'] ?></p>
                        </div>

                    </a>

                </div>

            <?php
            } ?>
        </div>
    </div>
    <div class="footer">
        <div class="abt">About us
            <p>astu news is a small start up company founded in astu and have a big dream to become a large tech company </p>
        </div>
        <div class="contact">
            <p> contact us</p>
            +251984695747 Solomon Adola
        </div>
        <div class="copyr">
            copyright&copy;ASTU NEWS
        </div>

    </div>
    <script src="./js/script.js" async defer>
    </script>
</body>

</html>